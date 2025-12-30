import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { CustomerService } from '../../services/customer';
import { MessageCategoryService } from '../../services/message-category';
import { MessageService } from '../../services/message';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  stats = {
    customers: 0,
    messages: 0,
    messagesSent: 0,
    messagesQueued: 0
  };

  whatsappStatus: string = 'disconnected';
  recentLogs: any[] = [];
  currentUser: any = null;

  constructor(
    private customerService: CustomerService,
    private messageCategoryService: MessageCategoryService,
    private messageService: MessageService,
    private socketService: SocketService,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    this.loadStats();
    this.loadRecentLogs();

    this.socketService.onStatus().subscribe(data => {
      this.ngZone.run(() => {
        this.whatsappStatus = data.status;
        this.cdr.detectChanges();
      });
    });
  }

  connectGoogleContacts() {
    if (this.currentUser && this.currentUser.id) {
      // Open in a new window/popup width 500x600 centered
      const width = 500;
      const height = 600;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);

      window.open(
        `http://localhost:3000/auth/google/connect?adminId=${this.currentUser.id}`,
        'GoogleConnect',
        `width=${width},height=${height},top=${top},left=${left}`
      );
    } else {
      alert('User ID not found via AuthService. Please login again.');
    }
  }

  loadStats() {
    this.customerService.getAll().subscribe(customers => {
      this.ngZone.run(() => {
        this.stats.customers = customers.length;
        this.cdr.detectChanges();
      });
    });

    this.messageCategoryService.getAll().subscribe(messages => {
      this.ngZone.run(() => {
        this.stats.messages = messages.length;
        this.cdr.detectChanges();
      });
    });

    this.messageService.getLogs().subscribe(logs => {
      this.ngZone.run(() => {
        this.stats.messagesSent = logs.filter(l => l.status === 'sent').length;
        this.stats.messagesQueued = logs.filter(l => l.status === 'queued').length;
        this.cdr.detectChanges();
      });
    });
  }

  loadRecentLogs() {
    this.messageService.getLogs().subscribe(logs => {
      this.ngZone.run(() => {
        this.recentLogs = logs.slice(0, 5);
        this.cdr.detectChanges();
      });
    });
  }
}
