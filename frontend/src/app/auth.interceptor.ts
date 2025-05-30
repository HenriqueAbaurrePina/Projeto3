import { Injectable, Injector } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshInProgress: Promise<string> | null = null;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authService = this.injector.get(AuthService);
    const token = authService.getToken();

    // Bloqueia tentativa de refresh se não há token algum (ex: após logout)
    if (!token && req.url.includes('/auth/refresh')) {
      return throwError(() => new Error('Tentativa de refresh após logout'));
    }

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
          !req.url.includes('/auth/refresh') &&
          !req.url.includes('/auth/logout')
        ) {
          // Verificação extra de token válido
          if (!authService.getToken()) {
            return throwError(() => new Error('Token ausente. Ignorando refresh.'));
          }

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
                this.injector.get(AuthService).logout(); // Força logout em erro
                this.injector.get(Router).navigate(['/login']);
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
