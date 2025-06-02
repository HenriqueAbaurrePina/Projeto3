import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './empresa.component.html',
  styleUrls: ['./empresa.component.css']
})
export class EmpresaComponent implements OnInit {
  empresaId!: string;
  empresa: any;
  projetos: any[] = [];
  tipoUsuario: string = '';
  usuarioSelecionadoParaExclusao: string | null = null;
  modoExclusaoUsuario: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/auth/usuario-logado`, { withCredentials: true }).subscribe({
      next: (usuario: any) => {
        this.tipoUsuario = usuario.tipo;
  
        if (this.tipoUsuario === 'adm') {
          this.empresaId = this.route.snapshot.paramMap.get('id')!;
          this.http.get(`${environment.apiUrl}/empresa/${this.empresaId}`).subscribe({
            next: (res: any) => {
              this.empresa = res;
              this.projetos = res.projetos || [];
            },
            error: err => {
              console.error('Erro ao buscar empresa (ADM):', err);
              this.router.navigate(['/erro']);
            }
          });
        } else {
          this.http.get(`${environment.apiUrl}/empresa`).subscribe({
            next: (res: any) => {
              this.empresa = res;
              this.projetos = res.projetos || [];
              this.empresaId = res._id;
            },
            error: err => {
              console.error('Erro ao buscar empresa (filho):', err);
              this.router.navigate(['/erro']);
            }
          });
        }
      },
      error: err => {
        console.error('Erro ao obter usuário logado:', err);
        this.router.navigate(['/login']);
      }
    });
  }  

  definirStatusProjeto(projeto: any): string {
    const sprints = projeto.sprints || [];

    if (sprints.length === 0) return 'Planejado';
    if (sprints.every((s: any) => this.definirStatusSprint(s) === 'Planejado')) return 'Planejado';
    if (sprints.every((s: any) => this.definirStatusSprint(s) === 'Concluído')) return 'Concluído';
    if (sprints.some((s: any) => this.definirStatusSprint(s) === 'Atrasado')) return 'Atrasado';

    return 'Em Andamento';
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

  criarUsuarioFilho() {
    this.router.navigate(['/usuario/criar', this.empresaId]);
  }

  criarProjeto() {
    this.router.navigate(['/projeto/criar', this.empresaId]);
  }

  verProjeto(id: string) {
    this.router.navigate(['/projeto', id]);
  }  

  voltar() {
    this.router.navigate(['/dashboard']);
  }

  iniciarExclusaoUsuario() {
    this.modoExclusaoUsuario = true;
  }
  
  cancelarExclusaoUsuario() {
    this.modoExclusaoUsuario = false;
    this.usuarioSelecionadoParaExclusao = null;
  }
  
  confirmarExclusaoUsuario() {
    if (!this.usuarioSelecionadoParaExclusao) return;
  
    const confirmar = confirm('Tem certeza que deseja excluir este usuário? Essa ação não poderá ser desfeita.');
    if (!confirmar) return;
  
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    this.http.delete(`${environment.apiUrl}/empresa/${this.empresaId}/usuarios/${this.usuarioSelecionadoParaExclusao}`, { headers })
      .subscribe({
        next: () => {
          alert('Usuário excluído com sucesso.');
          location.reload();
        },
        error: err => {
          console.error('Erro ao excluir usuário:', err);
          alert('Erro ao excluir usuário.');
        }
      });
  }

}
