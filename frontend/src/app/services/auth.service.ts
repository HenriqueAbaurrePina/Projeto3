import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}`;
  private tokenKey = 'accessToken';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, senha: string) {
    return this.http.post<{ accessToken: string; refreshToken: string }>(`${this.baseUrl}/auth/login`, { email, senha }, { withCredentials: true });
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (e) {
      return false;
    }
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  
    this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        setTimeout(() => this.router.navigate(['/login']), 0);
      },
      error: () => {
        setTimeout(() => this.router.navigate(['/login']), 0); // mesmo em erro, redireciona
      }
    });
  } 

  refreshToken() {
    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/auth/refresh`,{},{ withCredentials: true });
  }

  getEmpresaDoUsuario() {
    return this.http.get(`${this.baseUrl}/empresa/do-usuario`);
  }
  
}
