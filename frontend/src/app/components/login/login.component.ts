import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  senha = '';
  erro = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  onLogin() {
    this.auth.login(this.email, this.senha).subscribe({
      next: res => {
        this.auth.setToken(res.token);

        const payload = JSON.parse(atob(res.token.split('.')[1]));
        if (payload.tipo === 'adm') {
          this.router.navigate(['/dashboard']);
        } else {
          // Buscar a empresa do usuário filho
          const headers = new HttpHeaders().set('Authorization', `Bearer ${res.token}`);
          this.http.get(`${environment.apiUrl}/empresa`, { headers }).subscribe({
            next: (empresa: any) => {
              this.router.navigate(['/empresa', empresa._id]);
            },
            error: () => {
              this.erro = 'Erro ao buscar empresa do usuário.';
            }
          });
        }
      },
      error: () => {
        this.erro = 'Login inválido';
      }
    });
  }
}
