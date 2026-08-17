// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerUsuarioPorId(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/usuarios/${id}`);
  }

  buscarUsuarios(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/usuarios/buscar?q=${query}`);
  }
}