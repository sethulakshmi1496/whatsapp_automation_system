import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isRegister: boolean = false;
  error: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  onSubmit() {
    this.error = '';
    this.loading = true;
    console.log('[LoginComponent] Form submitted, isRegister:', this.isRegister);

    if (this.isRegister) {
      console.log('[LoginComponent] Starting registration for:', this.email);
      this.authService.register(this.email, this.password).subscribe({
        next: () => {
          console.log('[LoginComponent] Registration successful');
          this.ngZone.run(() => {
            // Save email for alert message
            const savedEmail = this.email;

            // Update state FIRST
            this.loading = false;
            this.isRegister = false;
            this.email = '';
            this.password = '';
            this.error = '';

            // Force change detection immediately
            this.cdr.detectChanges();
            console.log('[LoginComponent] Change detection triggered, loading:', this.loading, 'isRegister:', this.isRegister);

            // Show success modal AFTER state updates (with small delay to ensure UI renders)
            setTimeout(() => {
              this.modalService.success(`Registration successful! Please login with ${savedEmail}`, 'Welcome!');
            }, 100);
          });
        },
        error: (err) => {
          console.error('[LoginComponent] Registration error:', err);
          this.ngZone.run(() => {
            this.error = err.error?.error || err.message || 'Registration failed';
            this.loading = false;
          });
        },
        complete: () => {
          console.log('[LoginComponent] Registration observable completed');
        }
      });

      // Safety timeout - if no response after 10 seconds, reset
      setTimeout(() => {
        if (this.loading && this.isRegister) {
          console.warn('[LoginComponent] Registration timeout - resetting state');
          this.ngZone.run(() => {
            this.loading = false;
            this.error = 'Request timeout. Please try again.';
          });
        }
      }, 10000);
    } else {
      console.log('[LoginComponent] Starting login for:', this.email);
      this.authService.login(this.email, this.password).subscribe({
        next: () => {
          console.log('[LoginComponent] Login successful');
          this.ngZone.run(() => {
            this.loading = false;
            this.router.navigate(['/dashboard']);
          });
        },
        error: (err) => {
          console.error('[LoginComponent] Login error:', err);
          this.ngZone.run(() => {
            this.error = err.error?.message || err.message || 'Login failed';
            this.loading = false;
          });
        }
      });
    }
  }

  toggleMode() {
    this.isRegister = !this.isRegister;
    this.error = '';
    this.email = '';
    this.password = '';
  }
}
