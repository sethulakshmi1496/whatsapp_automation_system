// frontend/src/app/services/socket.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private statusSubject = new BehaviorSubject<any>({ status: 'disconnected' });
  private qrSubject = new BehaviorSubject<any>(null);
  private connectedSubject = new BehaviorSubject<string>('');

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    // only create once
    if (this.socket) return;

    // Use environment configuration for socket URL
    const url = environment.apiUrl.replace('/api', '');

    // Create socket with reconnection enabled
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      this.connectedSubject.next(this.socket?.id || '');
      console.log('[SocketService] connected', this.socket?.id);

      // Send join event with adminId for multi-tenant support
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            console.log('[SocketService] Sending join event with adminId:', user.id);
            this.socket?.emit('join', { adminId: user.id });
          } else {
            console.warn('[SocketService] User object found but no ID');
          }
        } else {
          console.warn('[SocketService] No user in localStorage, cannot join admin room');
        }
      } catch (e) {
        console.error('[SocketService] Error sending join event:', e);
      }
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('[SocketService] disconnected', reason);
      // emit disconnected status; do NOT trigger backend logout
      this.statusSubject.next({ status: 'disconnected', reason });
    });

    // listen for qr events
    this.socket.on('qr', (payload: any) => {
      console.log('[SocketService] QR event received:', payload ? 'QR data present' : 'no QR data');
      try { this.qrSubject.next(payload); } catch (e) { console.warn('qr emit error', e); }
    });

    // listen for status events
    this.socket.on('status', (payload: any) => {
      console.log('[SocketService] Status event received:', payload);
      try { this.statusSubject.next(payload); } catch (e) { console.warn('status emit error', e); }
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('[SocketService] connect_error', err && err.message);
    });

    // listen for customer_added events
    this.socket.on('customer_added', (payload: any) => {
      console.log('[SocketService] Customer added event received:', payload);
    });

    // keep reference in window for debugging
    (window as any).APP_SOCKET = this.socket;
  }

  // Observables for components to subscribe
  onStatus(): Observable<any> { return this.statusSubject.asObservable(); }
  onQr(): Observable<any> { return this.qrSubject.asObservable(); }
  onConnected(): Observable<string> { return this.connectedSubject.asObservable(); }

  onMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket?.on('new_message', (data: any) => {
        console.log('[SocketService] new_message received:', data);
        observer.next(data);
      });
    });
  }

  // Expose a method to emit events to the backend if needed
  emit(event: string, data?: any) {
    if (!this.socket) this.initSocket();
    this.socket?.emit(event, data);
  }

  // Close socket only when app is explicitly shutting down (not on navigation)
  close() {
    try {
      this.socket?.disconnect();
      this.socket = null;
      console.log('[SocketService] socket closed by app');
    } catch (e) {
      console.warn('[SocketService] close error', e);
    }
  }
}
