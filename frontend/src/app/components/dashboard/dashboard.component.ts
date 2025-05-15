import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  tipoUsuario = '';
  empresas: any[] = [];
  empresa: any; // Empresa do usuário filho, se aplicável
  mostrarConfirmacaoExclusao = false;
  empresaParaExcluir: any = null;
  emailConfirmacao = '';
  senhaConfirmacao = '';
  erroExclusao = '';


  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (!token) return;
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    this.http.get(`${environment.apiUrl}/auth/usuario-logado`, { headers }).subscribe({
      next: (res: any) => {
        this.tipoUsuario = res.tipo;
  
        this.http.get(`${environment.apiUrl}/empresa`, { headers }).subscribe({
          next: (res: any) => {
            if (this.tipoUsuario === 'adm') {
              this.empresas = Array.isArray(res) ? res : [res];
            } else {
              this.empresas = res ? [res] : [];
            }
          },
          error: err => console.error('Erro ao carregar empresa:', err)
        });
      },
      error: err => {
        console.error('Erro ao buscar tipo do usuário:', err);
      }
    });
  }  

  criarEmpresa() {
    const nome = prompt('Nome da empresa:');
    if (!nome) return;

    this.http.post(`${environment.apiUrl}/empresa`, { nome }).subscribe({
      next: () => location.reload(),
      error: err => alert('Erro ao criar empresa: ' + (err.error?.mensagem || err.message))
    });
  }

  verEmpresa(id: string) {
    this.router.navigate(['/empresa', id]);
  }

  logout() {
    this.auth.logout();
  }

  abrirConfirmacaoExclusao(empresa: any) {
  this.empresaParaExcluir = empresa;
  this.mostrarConfirmacaoExclusao = true;
  this.emailConfirmacao = '';
  this.senhaConfirmacao = '';
  this.erroExclusao = '';
  }

  cancelarExclusao() {
    this.mostrarConfirmacaoExclusao = false;
    this.empresaParaExcluir = null;
  }

  confirmarExclusaoEmpresa() {
    if (!this.emailConfirmacao || !this.senhaConfirmacao) {
      this.erroExclusao = 'Preencha todos os campos.';
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
    const body = {
      email: this.emailConfirmacao,
      senha: this.senhaConfirmacao
    };

    this.http.delete(
      `${environment.apiUrl}/empresa/excluir/${this.empresaParaExcluir._id}`,
      { headers, body }
    ).subscribe({
      next: () => {
        alert('Empresa excluída com sucesso.');
        location.reload();
      },
      error: err => {
        this.erroExclusao = err.error?.mensagem || 'Erro ao excluir empresa.';
      }
    });
  }

  sair() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

}
