import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = `${environment.apiUrl}/chat`;

    constructor(private http: HttpClient) { }

    getConversations(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/conversations`);
    }

    getHistory(phone: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/history/${phone}`);
    }
}
