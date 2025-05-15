import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-projeto-criar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './projeto-criar.component.html'
})
export class ProjetoCriarComponent implements OnInit {
  empresaId!: string;
  nome = '';
  descricao = '';
  dataInicio: Date | null = null;
  dataFim: Date | null = null;
  usuarios: any[] = [];
  usuariosSelecionados: string[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.empresaId = this.route.snapshot.paramMap.get('empresaId')!;

    this.http.get<any[]>(`${environment.apiUrl}/empresa/` + this.empresaId).subscribe({
      next: (res: any) => {
        this.usuarios = res.usuariosFilhos || [];
      },
      error: err => console.error('Erro ao buscar usuários filhos:', err)
    });
  }

  criarProjeto() {
    if (!this.nome || !this.dataInicio || !this.dataFim) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
  
    const inicioFormatado = this.dataInicio.toISOString().split('T')[0];
    const fimFormatado = this.dataFim.toISOString().split('T')[0];
  
    this.http.post(`${environment.apiUrl}/projetos`, {
      nome: this.nome,
      descricao: this.descricao,
      dataInicio: inicioFormatado,
      dataFim: fimFormatado,
      empresaId: this.empresaId,
      usuarios: this.usuariosSelecionados // ✅ nome correto
    }).subscribe({
      next: () => this.router.navigate(['/empresa', this.empresaId]),
      error: err => alert('Erro ao criar projeto: ' + (err.error?.mensagem || err.message))
    });
  }
  

  cancelar() {
    this.router.navigate(['/empresa', this.empresaId]);
  }

  toggleUsuario(id: string, checked: boolean) {
    if (checked) {
      this.usuariosSelecionados.push(id);
    } else {
      this.usuariosSelecionados = this.usuariosSelecionados.filter(u => u !== id);
    }
  }
}