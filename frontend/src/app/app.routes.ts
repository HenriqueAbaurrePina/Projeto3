import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ProjetoCriarComponent } from './components/Projeto-criar/projeto-criar.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'empresa/:id',
    loadComponent: () => import('./components/empresa/empresa.component').then(m => m.EmpresaComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'projeto/criar/:empresaId',
    loadComponent: () =>
      import('./components/Projeto-criar/projeto-criar.component').then(m => m.ProjetoCriarComponent)
  },
  {
    path: 'usuario/criar/:empresaId',
    loadComponent: () => import('./components/usuario-criar/usuario-criar.component').then(m => m.UsuarioCriarComponent)
  },
  {
    path: 'projeto/:id',
    loadComponent: () => import('./components/projeto-detalhes/projeto-detalhes.component').then(m => m.ProjetoDetalhesComponent)
  },
  {
    path: 'erro',
    loadComponent: () =>
      import('./components/pagina-erro/pagina-erro.component').then(m => m.PaginaErroComponent)
  },
  {
    path: 'sprint/:id',
    loadComponent: () =>
      import('./components/sprint-detalhes/sprint-detalhes.component').then(m => m.SprintDetalhesComponent)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./components/cadastro/cadastro.component').then(m => m.CadastroComponent)
  }  
];
