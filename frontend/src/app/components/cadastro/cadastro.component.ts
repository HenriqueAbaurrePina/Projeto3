import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './cadastro.component.html'
})
export class CadastroComponent {
  nome = '';
  email = '';
  senha = '';
  erro = '';

  constructor(private http: HttpClient, private router: Router) {}

  cadastrar() {
    const dados = {
      nome: this.nome,
      email: this.email,
      senha: this.senha,
      tipo: 'adm'
    };

    this.http.post(`${environment.apiUrl}/auth/register`, dados).subscribe({
      next: () => {
        alert('Administrador cadastrado com sucesso!');
        this.router.navigate(['/login']);
      },
      error: err => {
        this.erro = err.error?.mensagem || 'Erro ao cadastrar.';
      }
    });
  }
}