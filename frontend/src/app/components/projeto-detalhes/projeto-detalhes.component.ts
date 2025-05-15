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
import { SprintCalendarComponent } from '../sprint-calendar/sprint-calendar.component';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-projeto-detalhes',
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
    RouterModule,
    SprintCalendarComponent
  ],
  templateUrl: './projeto-detalhes.component.html'
})
export class ProjetoDetalhesComponent implements OnInit {
  projetoId!: string;
  projeto: any;
  sprints: any[] = [];
  curvaS: any[] = [];
  tipoUsuario: string = '';
  usuarioId = '';

  nomeSprint = '';
  dataInicioSprint: Date | null = null;
  erro = '';

  modoEdicao = false;
  formEdicao = {
    nome: '',
    descricao: '',
    dataInicio: new Date(),
    dataFim: new Date(),
    usuariosSelecionados: [] as string[]
  };

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.projetoId = this.route.snapshot.paramMap.get('id')!; 
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.tipoUsuario = payload.tipo;
      this.usuarioId = payload.id;
    }

    this.http.get(`${environment.apiUrl}/projetos/${this.projetoId}`).subscribe({
      next: res => {
        this.projeto = res;
        this.formEdicao = {
          nome: this.projeto.nome,
          descricao: this.projeto.descricao,
          dataInicio: new Date(this.projeto.dataInicio),
          dataFim: new Date(this.projeto.dataFim),
          usuariosSelecionados: this.projeto.usuarios.map((u: any) => u._id)
        };
        const empresaId = typeof this.projeto.empresaId === 'object'
          ? this.projeto.empresaId._id
          : this.projeto.empresaId; 
        if (!empresaId) return;
        this.http.get<any[]>(`${environment.apiUrl}/empresa/${empresaId}/usuarios`).subscribe({
          next: usuarios => this.projeto.todosUsuarios = usuarios,
          error: err => console.error('Erro ao carregar usuários da empresa:', err)
        });
        this.http.get<any[]>(`${environment.apiUrl}/sprints?projetoId=${this.projetoId}`).subscribe({
          next: sprints => {
            this.sprints = sprints;
            this.gerarCurvaS();
          },
          error: err => console.error('Erro ao buscar sprints:', err)
        });
      },
      error: err => {
        if (err.status === 404) this.router.navigate(['/erro']);
        else console.error('Erro ao buscar projeto:', err);
      }
    });
  }

  criarSprint() {
    if (!this.nomeSprint || !this.dataInicioSprint) {
      this.erro = 'Todos os campos são obrigatórios.';
      return;
    }

    this.http.post(`${environment.apiUrl}/projetos/${this.projetoId}/sprints`, {
      nome: this.nomeSprint,
      dataInicio: this.dataInicioSprint
    }).subscribe({
      next: sprint => {
        alert('Sprint criada com sucesso.');
        this.sprints.push(sprint);
        this.gerarCurvaS();
      },
      error: err => alert('Erro ao criar sprint: ' + (err.error?.mensagem || err.message))
    });
  }

  gerarCurvaS() {
    const previstasMap: Record<string, number> = {};
    const realizadasMap: Record<string, number> = {};

    this.sprints.forEach(sprint => {
      sprint.entregas.forEach((entrega: any) => {
        const prevista = new Date(entrega.dataPrevista).toISOString().split('T')[0];
        previstasMap[prevista] = (previstasMap[prevista] || 0) + 1;

        if (entrega.dataEntregue) {
          const entregue = new Date(entrega.dataEntregue).toISOString().split('T')[0];
          realizadasMap[entregue] = (realizadasMap[entregue] || 0) + 1;
        }
      });
    });

    const todasDatas = Array.from(new Set([
      ...Object.keys(previstasMap),
      ...Object.keys(realizadasMap)
    ])).sort();

    let acumuladoPrevistas = 0;
    let acumuladoRealizadas = 0;

    this.curvaS = todasDatas.map(data => {
      acumuladoPrevistas += previstasMap[data] || 0;
      acumuladoRealizadas += realizadasMap[data] || 0;
      return {
        data,
        previstasAcumuladas: acumuladoPrevistas,
        realizadasAcumuladas: acumuladoRealizadas
      };
    });
  }

  voltarParaEmpresa() {
    const empresaId = typeof this.projeto.empresaId === 'object'
      ? this.projeto.empresaId._id
      : this.projeto.empresaId;
    this.router.navigate(['/empresa', empresaId]);
  }

  salvarEdicaoProjeto() {
    const atualizacao = {
      nome: this.formEdicao.nome,
      descricao: this.formEdicao.descricao,
      dataInicio: this.formEdicao.dataInicio,
      dataFim: this.formEdicao.dataFim,
      usuarios: this.formEdicao.usuariosSelecionados
    };

    this.http.put(`${environment.apiUrl}/projetos/${this.projetoId}`, atualizacao).subscribe({
      next: () => {
        alert('Projeto atualizado com sucesso.');
        location.reload();
      },
      error: err => alert('Erro ao editar projeto: ' + (err.error?.mensagem || err.message))
    });
  }

  confirmarExclusaoProjeto() {
    const confirmar = confirm('Tem certeza que deseja excluir este projeto? Esta ação não poderá ser desfeita.');
    if (!confirmar) return;

    this.http.delete(`${environment.apiUrl}/projetos/${this.projetoId}`).subscribe({
      next: () => {
        alert('Projeto excluído com sucesso.');
        this.router.navigate(['/empresa', this.projeto.empresaId]);
      },
      error: err => alert('Erro ao excluir projeto: ' + (err.error?.mensagem || err.message))
    });
  }
  
  definirStatusSprint(sprint: any): string {
    const hoje = new Date();
    const entregas = sprint.entregas || [];
  
    if (entregas.length === 0) return 'Planejado';
    if (entregas.every((e: any) => e.dataEntregue)) return 'Concluído';
    if (entregas.some((e: any) =>
      !e.dataEntregue &&
      (
        new Date(e.dataPrevista) < hoje ||
        new Date(sprint.dataFim) < hoje
      )
    )) return 'Atrasado';
  
    return 'Em Andamento';
  }  

  get entregasPendentes() {
    return this.projeto?.entregas?.filter((e: any) => !e.dataEntregue) || [];
  }

  get entregasConcluidas() {
    return this.projeto?.entregas?.filter((e: any) => !!e.dataEntregue) || [];
  }
}
