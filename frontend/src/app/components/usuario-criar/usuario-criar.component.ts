import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-usuario-criar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './usuario-criar.component.html'
})
export class UsuarioCriarComponent implements OnInit {
  empresaId!: string;
  nome = '';
  email = '';
  senha = '';
  erro = '';

  projetos: any[] = [];
  projetosSelecionados: string[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.empresaId = this.route.snapshot.paramMap.get('empresaId')!;

    // Buscar projetos da empresa
    this.http.get(`${environment.apiUrl}/empresa/${this.empresaId}`).subscribe({
      next: (res: any) => {
        this.projetos = res.projetos || [];
      },
      error: err => console.error('Erro ao buscar projetos:', err)
    });
  }

  toggleProjeto(id: string, checked: boolean) {
    if (checked) {
      this.projetosSelecionados.push(id);
    } else {
      this.projetosSelecionados = this.projetosSelecionados.filter(pid => pid !== id);
    }
  }

  criarUsuario() {
    if (!this.nome || !this.email || !this.senha) {
      this.erro = 'Todos os campos são obrigatórios.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.erro = 'Email inválido.';
      return;
    }

    this.http.post(`${environment.apiUrl}/auth/filho`, {
      nome: this.nome,
      email: this.email,
      senha: this.senha,
      empresaId: this.empresaId,
      projetosIds: this.projetosSelecionados
    }).subscribe({
      next: () => this.router.navigate(['/empresa', this.empresaId]),
      error: err => {
        this.erro = err.error?.mensagem || 'Erro ao criar usuário.';
      }
    });
  }

  cancelar() {
    this.router.navigate(['/empresa', this.empresaId]);
  }
}
