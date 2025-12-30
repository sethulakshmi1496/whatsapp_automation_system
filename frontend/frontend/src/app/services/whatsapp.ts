import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) { }

  getStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status`);
  }

  disconnect(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/disconnect`, {});
  }

  getQr(): Observable<any> {
    // QR is obtained via socket.io, but we can try to get status
    return this.http.get<any>(`${this.apiUrl}/status`);
  }

  reload(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl.replace('/api', '')}/api/force-qr`, {});
  }
}
