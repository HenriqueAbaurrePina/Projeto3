import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CurvaSComponent } from '../entrega-curva-s/curva-s.component';
import { SprintCalendarComponent } from '../entrega-calendar/sprint-calendar.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sprint-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CurvaSComponent,
    SprintCalendarComponent
  ],
  templateUrl: './sprint-detalhes.component.html'
})
export class SprintDetalhesComponent implements OnInit {
  sprintId!: string;
  sprint: any;
  tipoUsuario: string = '';
  usuarioId = '';

  // Nova entrega
  titulo = '';
  usuarioSelecionado = '';
  dataPrevista: Date | null = null;
  erro = '';

  entregaEmEdicaoId: string | null = null;
  formEntregaEdicao = {
    titulo: '',
    dataPrevista: new Date()
  };

  modoEdicao = false;
  formSprint = {
    nome: '',
    dataInicio: new Date()
  };


  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
  
    this.http.get(`${environment.apiUrl}/auth/usuario-logado`, { withCredentials: true }).subscribe({
      next: (usuario: any) => {
        this.tipoUsuario = usuario.tipo;
        this.usuarioId = usuario._id;
  
        this.http.get(`${environment.apiUrl}/sprints/${this.sprintId}`).subscribe({
          next: (res: any) => {
            this.sprint = res;
  
            const usuarioEhFilhoDaSprint = this.sprint.usuarios?.some((u: any) => u._id === this.usuarioId);
            const usuarioEhAdmDaEmpresa =
              this.tipoUsuario === 'adm' &&
              (Array.isArray(usuario.empresaId)
                ? usuario.empresaId.includes(this.sprint.empresaId)
                : usuario.empresaId === this.sprint.empresaId);
  
            if (!usuarioEhFilhoDaSprint && !usuarioEhAdmDaEmpresa) {
              this.router.navigate(['/erro']);
            }
          },
          error: err => {
            console.error('Erro ao buscar sprint:', err);
            this.router.navigate(['/erro']);
          }
        });
      },
      error: err => {
        console.error('Erro ao buscar usuário logado:', err);
        this.router.navigate(['/login']);
      }
    });
  }    

  criarEntrega() {
    if (!this.titulo || !this.usuarioSelecionado || !this.dataPrevista) {
      this.erro = 'Todos os campos são obrigatórios.';
      return;
    }

    const novaEntrega = {
      titulo: this.titulo,
      usuarioId: this.usuarioSelecionado,
      dataPrevista: this.dataPrevista
    };

    this.http.post(`${environment.apiUrl}/sprints/${this.sprintId}/entregas`, novaEntrega).subscribe({
      next: () => location.reload(),
      error: err => {
        this.erro = err.error?.mensagem || 'Erro ao criar entrega.';
      }
    });
  }

  iniciarEdicaoEntrega(entrega: any) {
    this.entregaEmEdicaoId = entrega._id;
    this.formEntregaEdicao = {
      titulo: entrega.titulo,
      dataPrevista: new Date(entrega.dataPrevista)
    };
  }

  cancelarEdicaoEntrega() {
    this.entregaEmEdicaoId = null;
  }

  salvarEdicaoEntrega(entregaId: string) {
    this.http.put(`${environment.apiUrl}/sprints/${this.sprintId}/entregas/${entregaId}`, this.formEntregaEdicao).subscribe({
      next: () => location.reload(),
      error: err => alert('Erro ao editar entrega: ' + (err.error?.mensagem || err.message))
    });
  }

  excluirEntrega(entregaId: string) {
    if (!confirm('Deseja realmente excluir esta entrega?')) return;

    this.http.delete(`${environment.apiUrl}/sprints/${this.sprintId}/entregas/${entregaId}`).subscribe({
      next: () => location.reload(),
      error: err => alert('Erro ao excluir entrega: ' + (err.error?.mensagem || err.message))
    });
  }

  marcarComoEntregue(entregaId: string) {
    this.http.put(`${environment.apiUrl}/sprints/${this.sprintId}/entregas/${entregaId}/entregar`, {}).subscribe({
      next: () => location.reload(),
      error: err => alert('Erro ao marcar como entregue: ' + (err.error?.mensagem || err.message))
    });
  }

  get entregasPendentes() {
    return this.sprint?.entregas?.filter((e: any) => !e.dataEntregue) || [];
  }

  get entregasConcluidas() {
    return this.sprint?.entregas?.filter((e: any) => !!e.dataEntregue) || [];
  }

  salvarEdicaoSprint() {
    const atualizacao = {
      nome: this.formSprint.nome,
      dataInicio: this.formSprint.dataInicio
    };
  
    this.http.put(`${environment.apiUrl}/sprints/${this.sprintId}`, atualizacao).subscribe({
      next: () => {
        alert('Sprint atualizada com sucesso.');
        location.reload();
      },
      error: err => {
        alert('Erro ao editar sprint: ' + (err.error?.mensagem || err.message));
      }
    });
  }
  
  confirmarExclusaoSprint() {
    const confirmar = confirm('Tem certeza que deseja excluir esta sprint? Esta ação não poderá ser desfeita.');
    if (!confirmar) return;
  
    this.http.delete(`${environment.apiUrl}/sprints/${this.sprintId}`).subscribe({
      next: () => {
        alert('Sprint excluída com sucesso.');
        this.router.navigate(['/projeto', this.sprint.projetoId]); // voltar para projeto
      },
      error: err => {
        alert('Erro ao excluir sprint: ' + (err.error?.mensagem || err.message));
      }
    });
  }
  voltarParaProjeto() {
    this.router.navigate(['/projeto', this.sprint.projetoId]);
  }
}
