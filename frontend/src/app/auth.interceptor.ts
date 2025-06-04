import { Injectable, Injector } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, from, switchMap, catchError } from 'rxjs';
import { AuthService } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshInProgress: Promise<string> | null = null;

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('[Interceptor] Rota:', req.url);

    const authService = this.injector.get(AuthService);
    const token = authService.getAccessToken(); // ← 🔑 Token sempre do AuthService

    const authReq = token
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })
      : req.clone({ withCredentials: true });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/refresh') &&
          !req.url.includes('/auth/logout')
        ) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;

            this.refreshInProgress = authService
              .refreshToken()
              .toPromise()
              .then((res: any) => {
                this.isRefreshing = false;

                if (!res?.accessToken) {
                  throw new Error('Access token ausente na resposta de refresh');
                }
                authService.setAccessToken(res.accessToken); // ← Salva no serviço
                return res.accessToken
              })
              .catch((err) => {
                this.isRefreshing = false;
                authService.logout();
                this.injector.get(Router).navigate(['/login']);
                throw err;
              });
          }

          return from(this.refreshInProgress!).pipe(
            switchMap((newToken) => {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
                withCredentials: true
              });
              return next.handle(retryReq);
            }),
            catchError((err) => throwError(() => err))
          );
        }

        return throwError(() => error);
      })
    );
  }
}
