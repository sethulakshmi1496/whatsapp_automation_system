// frontend/src/app/pages/connect-whatsapp/connect-whatsapp.ts
import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Import the singleton SocketService you created earlier
import { SocketService } from '../../services/socket';
import { WhatsappService } from '../../services/whatsapp';

// Import the header and sidebar components (standalone or normal components)
// Adjust paths if your files are in a different folder
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';

@Component({
  // Make this component standalone so we can import CommonModule and other components directly
  standalone: true,
  selector: 'app-connect-whatsapp',
  templateUrl: './connect-whatsapp.html',
  styleUrls: ['./connect-whatsapp.css'],
  imports: [
    CommonModule,
    SidebarComponent,
    HeaderComponent
  ]
})
export class ConnectWhatsappComponent implements OnInit, OnDestroy {
  qrCode: string | null = null;
  status: string = 'disconnected';
  statusMessage: string = 'Initializing...';
  deviceInfo: any = null;

  private qrSub?: Subscription;
  private statusSub?: Subscription;

  constructor(
    private socketService: SocketService,
    private whatsappService: WhatsappService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Set loading state
    this.statusMessage = 'Loading...';

    // Subscribe to socket events FIRST (these are more reliable and real-time)
    this.statusSub = this.socketService.onStatus().subscribe((data: any) => {
      this.ngZone.run(() => {
        console.log('[ConnectWhatsapp] Status update:', data);
        console.log('[ConnectWhatsapp] data.user:', JSON.stringify(data.user));
        this.status = data.status || this.status;

        if (data.user) {
          console.log('[ConnectWhatsapp] Setting deviceInfo from data.user:', data.user);
          this.deviceInfo = data.user;
        }

        if (this.status === 'connected') {
          this.qrCode = null;  // hide QR
          this.statusMessage = 'Connected! You are now ready to send and receive messages.';
          // Ensure deviceInfo is set even if not in the event
          if (!this.deviceInfo) {
            console.log('[ConnectWhatsapp] No deviceInfo, using fallback');
            this.deviceInfo = data.user || { name: 'WhatsApp', id: 'connected' };
          }
        } else if (this.status === 'loggedOut') {
          this.statusMessage = 'Account logged out — admin action required';
        } else if (this.status === 'auth_error') {
          this.statusMessage = 'Authentication error — admin action required';
        } else if (this.status === 'disconnected') {
          this.statusMessage = 'Disconnected';
        }

        console.log('[ConnectWhatsapp] Final deviceInfo:', JSON.stringify(this.deviceInfo));
        // Force change detection
        this.cdr.detectChanges();
      });
    });

    // Subscribe to QR events
    this.qrSub = this.socketService.onQr().subscribe({
      next: (data: any) => {
        console.log('[ConnectWhatsapp] QR subscription received:', data);
        this.ngZone.run(() => {
          // Only show QR if not already connected
          if (this.status !== 'connected') {
            this.qrCode = data?.qr || null;
            console.log('[ConnectWhatsapp] QR code set:', this.qrCode ? 'QR present' : 'no QR');
            if (this.qrCode) {
              this.status = 'qr';
              this.statusMessage = 'Scan this QR with WhatsApp';
            }
            try {
              this.cdr.detectChanges();
              console.log('[ConnectWhatsapp] Change detection triggered');
            } catch (e) {
              console.warn('[ConnectWhatsapp] detectChanges error:', e);
            }
          } else {
            console.log('[ConnectWhatsapp] Ignoring QR because already connected');
          }
        });
      }
    });

    // THEN get initial status from HTTP API (as fallback)
    // Use a small delay to let socket connect first
    setTimeout(() => {
      this.whatsappService.getStatus().subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            console.log('[ConnectWhatsapp] Initial HTTP status:', res);
            console.log('[ConnectWhatsapp] Initial status JSON:', JSON.stringify(res));

            // Only update if we haven't received a socket update yet
            if (this.statusMessage === 'Loading...') {
              this.status = res?.status || 'disconnected';

              if (this.status === 'connected' && res?.user) {
                this.deviceInfo = res.user;
                this.statusMessage = 'Connected! You are now ready to send and receive messages.';
                console.log('[ConnectWhatsapp] Set to CONNECTED with user:', res.user);
              } else if (this.status === 'connected' && !res?.user) {
                this.deviceInfo = { name: 'WhatsApp', id: 'connected' };
                this.statusMessage = 'Connected! You are now ready to send and receive messages.';
                console.log('[ConnectWhatsapp] Set to CONNECTED without user');
              } else {
                this.statusMessage = 'Initializing...';
                console.log('[ConnectWhatsapp] Status is NOT connected:', this.status);
              }
            }

            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('[ConnectWhatsapp] getStatus error:', err);
          this.ngZone.run(() => {
            if (this.statusMessage === 'Loading...') {
              this.status = 'disconnected';
              this.statusMessage = 'Disconnected';
            }
            this.cdr.detectChanges();
          });
        }
      });

      // Get current QR if available (only if not connected)
      this.whatsappService.getQr().subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            if (res?.qr && this.status !== 'connected') {
              this.qrCode = res.qr;
              this.status = 'qr';
              this.statusMessage = 'Scan this QR with WhatsApp';
              console.log('[ConnectWhatsapp] Initial QR loaded from API');
              try {
                this.cdr.detectChanges();
              } catch (e) { }
            }
          });
        },
        error: (err) => console.error('Failed to get QR', err)
      });
    }, 100); // Small delay to let socket connect
  }

  disconnect() {
    this.whatsappService.disconnect().subscribe(() => {
      this.ngZone.run(() => {
        this.qrCode = null;
        this.deviceInfo = null;
        this.status = 'disconnected';
        this.statusMessage = 'Disconnected';
        this.cdr.detectChanges();
      });
    });
  }

  reloadQr() {
    this.ngZone.run(() => {
      this.statusMessage = 'Reloading...';
      this.qrCode = null;
      this.cdr.detectChanges();
    });

    this.whatsappService.reload().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.statusMessage = 'Initializing new session...';
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Reload failed', err);
          this.statusMessage = 'Reload failed. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy() {
    this.qrSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    // IMPORTANT: do NOT close the socket here — socket is global singleton
  }
}
