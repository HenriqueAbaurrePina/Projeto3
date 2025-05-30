import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';
import { Injector } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshInProgress: Promise<string> | null = null;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authService = this.injector.get(AuthService);
    const token = authService.getToken();

    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
    } else {
      authReq = req.clone({ withCredentials: true });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/refresh')
        ) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;

            this.refreshInProgress = this.injector.get(AuthService).refreshToken().toPromise()
              .then(res => {
                if (!res?.accessToken) {
                  throw new Error('Access token ausente na resposta de refresh');
                }
                this.isRefreshing = false;
                authService.setToken(res.accessToken);
                return res.accessToken;
              })
              .catch(err => {
                this.isRefreshing = false;
                authService.logout(); // Opcional: força logout se o refresh falhar
                throw err;
              });
          }

          return from(this.refreshInProgress!).pipe(
            switchMap(newToken => {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
                withCredentials: true
              });
              return next.handle(retryReq);
            }),
            catchError(err => throwError(() => err))
          );
        }

        return throwError(() => error);
      })
    );
  }
}
