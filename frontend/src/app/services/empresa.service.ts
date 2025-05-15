import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private api = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getEmpresa() {
    return this.http.get(`${this.api}/empresa`);
  }
}
