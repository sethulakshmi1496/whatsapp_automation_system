import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  menuItems = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Connect WhatsApp', icon: '📱', route: '/connect-whatsapp' },
    { label: 'Chat', icon: '💬', route: '/chat' },
    { label: 'Customers', icon: '👥', route: '/customers' },
    { label: 'Messages', icon: '📝', route: '/messages' },
    { label: 'Send Message', icon: '✉️', route: '/send-message' },
    { label: 'Logs', icon: '📋', route: '/logs' }
  ];

  constructor(
    public router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() { }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
