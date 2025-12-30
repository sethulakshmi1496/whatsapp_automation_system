import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { MessageService } from '../../services/message';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class LogsComponent implements OnInit {
  logs: any[] = [];
  filteredLogs: any[] = [];
  filterStatus: string = 'all';
  searchTerm: string = '';

  stats = {
    total: 0,
    sent: 0,
    queued: 0,
    failed: 0
  };

  constructor(
    private messageService: MessageService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadLogs();
    setInterval(() => this.loadLogs(), 5000); // Auto-refresh every 5 seconds
  }

  loadLogs() {
    console.log('[LogsComponent] Loading logs...');
    this.messageService.getLogs().subscribe({
      next: (data) => {
        console.log('[LogsComponent] Logs loaded:', data);
        console.log('[LogsComponent] Logs count:', data.length);
        this.ngZone.run(() => {
          this.logs = data;
          this.calculateStats();
          this.applyFilters();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('[LogsComponent] Error loading logs:', error);
      }
    });
  }

  calculateStats() {
    this.stats.total = this.logs.length;
    this.stats.sent = this.logs.filter(l => l.status === 'sent').length;
    this.stats.queued = this.logs.filter(l => l.status === 'queued').length;
    this.stats.failed = this.logs.filter(l => l.status === 'failed').length;
    console.log('[LogsComponent] Stats calculated:', this.stats);
  }

  applyFilters() {
    this.filteredLogs = this.logs.filter(log => {
      const matchesStatus = this.filterStatus === 'all' || log.status === this.filterStatus;
      const matchesSearch = !this.searchTerm ||
        log.to_phone.includes(this.searchTerm) ||
        log.body?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  getStatusClass(status: string): string {
    return status;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'sent': return '✅';
      case 'queued': return '⏳';
      case 'failed': return '❌';
      default: return '📝';
    }
  }
}
