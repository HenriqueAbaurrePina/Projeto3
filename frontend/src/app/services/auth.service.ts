import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}`;
  private accessToken: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, senha: string) {
    return this.http.post(`${this.baseUrl}/auth/login`, { email, senha }, { withCredentials: true });
  }

  logout() {
    this.clearAccessToken();
    this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  refreshToken() {
    return this.http.post(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken() {
    this.accessToken = null;
  }

  getEmpresaDoUsuario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/empresa/do-usuario`, { withCredentials: true });
  }

  getUsuarioLogado() {
    return this.http.get(`${this.baseUrl}/auth/usuario-logado`, { withCredentials: true });
  }  
}
