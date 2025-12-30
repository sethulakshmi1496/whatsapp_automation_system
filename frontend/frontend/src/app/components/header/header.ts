// frontend/src/app/components/header/header.ts
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { SocketService } from '../../services/socket';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  // bound in header.html
  whatsappStatus: string = 'disconnected';
  currentTime: string = '';

  private statusSub?: Subscription;
  private clockSub?: Subscription;

  constructor(
    private socketService: SocketService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // subscribe to socket status updates
    this.statusSub = this.socketService.onStatus().subscribe({
      next: (s: any) => {
        // run inside zone so template updates correctly
        this.ngZone.run(() => {
          this.whatsappStatus = s?.status || this.whatsappStatus;
          // run change detection safely
          try { this.cdr.detectChanges(); } catch (e) {}
        });
      },
      error: (err) => {
        console.warn('Header: status subscription error', err);
      }
    });

    // start a lightweight clock (runs outside Angular then updates inside zone)
    // to avoid unnecessary change detection churn, run the interval outside zone and only re-enter for updates.
    this.ngZone.runOutsideAngular(() => {
      this.clockSub = interval(1000).subscribe(() => {
        const now = new Date();
        const formatted = now.toLocaleString(); // locale formatting
        this.ngZone.run(() => {
          this.currentTime = formatted;
          try { this.cdr.detectChanges(); } catch (e) {}
        });
      });
    });
  }

  ngAfterViewInit(): void {
    // avoid ExpressionChangedAfterItHasBeenCheckedError by deferring a detectChanges
    setTimeout(() => {
      try {
        this.cdr.detectChanges();
      } catch (e) {
        // harmless in production
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.clockSub?.unsubscribe();
  }
}
