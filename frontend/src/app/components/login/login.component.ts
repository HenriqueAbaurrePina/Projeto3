import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

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
        if (!res?.accessToken) {
          this.erro = 'Resposta inválida do servidor.';
          return;
        }

        this.auth.setToken(res.accessToken);

        const payload = JSON.parse(atob(res.accessToken.split('.')[1]));
        if (payload.tipo === 'adm') {
          this.router.navigate(['/dashboard']);
        } else {
          this.auth.getEmpresaDoUsuario().subscribe({
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
