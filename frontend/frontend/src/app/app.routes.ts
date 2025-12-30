// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { CustomersComponent } from './pages/customers/customers';
import { MessagesComponent } from './pages/messages/messages';
import { SendMessageComponent } from './pages/send-message/send-message';
import { LogsComponent } from './pages/logs/logs';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'connect-whatsapp',
    // load the standalone ConnectWhatsappComponent lazily so Angular knows about its imports
    loadComponent: () => import('./pages/connect-whatsapp/connect-whatsapp').then(m => m.ConnectWhatsappComponent),
    canActivate: [authGuard]
  },
  { path: 'customers', component: CustomersComponent, canActivate: [authGuard] },
  { path: 'messages', component: MessagesComponent, canActivate: [authGuard] },
  { path: 'templates', redirectTo: '/messages', pathMatch: 'full' }, // Redirect old route
  { path: 'send-message', component: SendMessageComponent, canActivate: [authGuard] },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat').then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  { path: 'logs', component: LogsComponent, canActivate: [authGuard] }
];
