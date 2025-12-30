import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res: any) => res.customers || [])
    );
  }

  create(customer: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, customer);
  }

  update(id: number, customer: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, customer);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  import(customers: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/import`, customers);
  }
}
