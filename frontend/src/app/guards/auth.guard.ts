import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.getUsuarioLogado().pipe(
      map(() => true),
      catchError((error) => {
        // Aguarda 500ms para o interceptor tentar refresh
        return timer(500).pipe(
          switchMap(() => this.auth.getUsuarioLogado()),
          map(() => true),
          catchError(() => {
            this.router.navigate(['/login']);
            return of(false);
          })
        );
      })
    );
  }
}
