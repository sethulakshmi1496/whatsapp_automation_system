import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;

  constructor(private http: HttpClient) { }

  send(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/send`, data);
  }

  sendBatch(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/send-batch`, data);
  }

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/logs`);
  }
}
