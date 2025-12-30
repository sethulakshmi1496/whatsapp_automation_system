// frontend/src/app/pages/customers/customers.ts
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './customers.html',
  styleUrls: ['./customers.css']
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];
  filteredCustomers: any[] = [];
  loading = false;
  error: string | null = null;

  // Search
  searchQuery = '';

  // Selected customer for messaging
  selectedCustomer: any = null;
  messageText = '';
  sending = false;

  // Delete modal
  showDeleteModal = false;
  customerToDelete: any = null;
  deleting = false;

  // Add/Edit modal
  showCustomerModal = false;
  isEditMode = false;
  saving = false;
  customerForm = {
    id: null,
    name: '',
    phone: '',
    email: '',
    tagsInput: ''
  };

  // Message modal
  showMessageModal = false;

  constructor(
    private http: HttpClient,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.error = null;
      this.cdr.detectChanges();
    });

    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('[CustomersComponent] Token exists:', !!token);
    console.log('[CustomersComponent] User:', user);

    if (!token) {
      console.error('[CustomersComponent] No token found!');
      this.error = 'Not authenticated. Please log in.';
      this.loading = false;
      return;
    }

    this.http.get<any>('/api/customers').subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.customers = Array.isArray(res) ? res : (Array.isArray(res?.customers) ? res.customers : []);
          this.filteredCustomers = [...this.customers];
          this.loading = false;
          console.log('Customers loaded:', this.customers.length);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Load customers error:', err);
          this.customers = [];
          this.filteredCustomers = [];
          this.error = err?.error?.message || err?.message || 'Failed to load customers';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Search and filter
  filterCustomers(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCustomers = [...this.customers];
    } else {
      this.filteredCustomers = this.customers.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }
    this.cdr.detectChanges();
  }

  // Get initials for avatar
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Delete functionality
  confirmDelete(customer: any): void {
    this.customerToDelete = customer;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.customerToDelete = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  deleteCustomer(): void {
    if (!this.customerToDelete) return;

    this.deleting = true;
    this.cdr.detectChanges();

    this.http.delete(`/api/customers/${this.customerToDelete.id}`).subscribe({
      next: () => {
        this.ngZone.run(() => {
          // Remove from local array
          this.customers = this.customers.filter(c => c.id !== this.customerToDelete.id);
          this.filterCustomers();
          this.closeDeleteModal();
          this.showSuccessMessage('Customer deleted successfully');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Delete error:', err);
          this.modalService.error('Failed to delete customer: ' + (err?.error?.error || err?.message || 'Unknown error'));
          this.deleting = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Add/Edit functionality
  openAddModal(): void {
    this.isEditMode = false;
    this.customerForm = {
      id: null,
      name: '',
      phone: '',
      email: '',
      tagsInput: ''
    };
    this.showCustomerModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(customer: any): void {
    this.isEditMode = true;
    this.customerForm = {
      id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      tagsInput: customer.tags ? customer.tags.join(', ') : ''
    };
    this.showCustomerModal = true;
    this.cdr.detectChanges();
  }

  closeCustomerModal(): void {
    this.showCustomerModal = false;
    this.saving = false;
    this.cdr.detectChanges();
  }

  saveCustomer(): void {
    if (!this.customerForm.name.trim() || !this.customerForm.phone.trim()) {
      this.modalService.warning('Name and phone are required');
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const tags = this.customerForm.tagsInput
      ? this.customerForm.tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : [];

    const payload = {
      name: this.customerForm.name.trim(),
      phone: this.customerForm.phone.trim(),
      email: this.customerForm.email.trim() || null,
      tags
    };

    const request = this.isEditMode
      ? this.http.put(`/api/customers/${this.customerForm.id}`, payload)
      : this.http.post('/api/customers', payload);

    request.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.closeCustomerModal();
          this.loadCustomers();
          this.showSuccessMessage(this.isEditMode ? 'Customer updated successfully' : 'Customer added successfully');
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Save error:', err);
          this.modalService.error('Failed to save customer: ' + (err?.error?.error || err?.message || 'Unknown error'));
          this.saving = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Message functionality
  selectCustomerForMessage(customer: any): void {
    this.selectedCustomer = customer;
    this.messageText = `Hello ${customer.name || ''}, `;
    this.showMessageModal = true;
    this.cdr.detectChanges();
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.selectedCustomer = null;
    this.messageText = '';
    this.sending = false;
    this.cdr.detectChanges();
  }

  sendMessage(): void {
    if (!this.selectedCustomer || !this.messageText.trim()) return;

    this.sending = true;
    this.cdr.detectChanges();

    const body = {
      phone: this.selectedCustomer.phone,
      text: this.messageText.trim()
    };

    this.http.post('/api/send-message', body).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.showSuccessMessage('Message sent successfully');
          this.closeMessageModal();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Send error:', err);
          this.modalService.error('Failed to send message: ' + (err?.error?.error || err?.message || 'Unknown error'));
          this.sending = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Helper to show success messages
  private showSuccessMessage(message: string): void {
    // You can replace this with a toast notification if you have one
    this.modalService.success(message);
  }
}
