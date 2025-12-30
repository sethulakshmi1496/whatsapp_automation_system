import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { CustomerService } from '../../services/customer';
import { TemplateService } from '../../services/template';
import { MessageService } from '../../services/message';
import { MessageCategoryService } from '../../services/message-category';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-send-message',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './send-message.html',
  styleUrls: ['./send-message.css']
})
export class SendMessageComponent implements OnInit {
  customers: any[] = [];
  templates: any[] = [];
  categories: string[] = [];

  selectedCustomers: number[] = [];
  selectedTemplate: number | null = null;
  selectedCategory: string | null = null;
  customMessage: string = '';
  isBulk: boolean = false;
  messagePreview: string = '';

  sending: boolean = false;

  constructor(
    private customerService: CustomerService,
    private templateService: TemplateService,
    private messageService: MessageService,
    private messageCategoryService: MessageCategoryService,
    private modalService: ModalService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadCustomers();
    this.loadTemplates(); // This will call loadCategories after templates load
  }

  getRiskLevel(): 'low' | 'medium' | 'high' | 'blocked' {
    const count = this.selectedCustomers.length;
    if (count === 0) return 'low';
    if (count === 1) return 'low';
    if (count === 2) return 'medium';
    if (count === 3) return 'high';
    return 'blocked'; // 4 or more
  }

  getRiskMessage(): string {
    const count = this.selectedCustomers.length;
    if (count === 0) {
      return 'Select customers to see risk assessment.';
    } else if (count === 1) {
      return 'WhatsApp account ban risk is LOW. Sending to 1 customer is safe.';
    } else if (count === 2) {
      return 'WhatsApp account ban risk is MEDIUM. Sending to 2 customers requires caution.';
    } else if (count === 3) {
      return 'WhatsApp account ban risk is HIGH. Sending to 3 customers may trigger spam detection.';
    } else {
      return 'LIMIT REACHED! You cannot select more than 3 customers. Please deselect some customers to continue.';
    }
  }

  getRiskColor(): string {
    const risk = this.getRiskLevel();
    if (risk === 'low') return '#10b981'; // Green
    if (risk === 'medium') return '#f59e0b'; // Orange
    if (risk === 'high') return '#ef4444'; // Red
    return '#dc2626'; // Dark red for blocked
  }

  getRiskIcon(): string {
    const risk = this.getRiskLevel();
    if (risk === 'low') return '✓';
    if (risk === 'medium') return '⚠';
    if (risk === 'high') return '⚠';
    return '🚫'; // Blocked icon
  }

  canSendMessages(): boolean {
    return this.selectedCustomers.length > 0 && this.selectedCustomers.length <= 3;
  }

  loadCustomers() {
    this.customerService.getAll().subscribe(data => {
      this.ngZone.run(() => {
        this.customers = data;
        // Auto-select the first customer for preview/testing if none selected
        if (this.customers.length > 0 && this.selectedCustomers.length === 0) {
          this.selectedCustomers = [this.customers[0].id];
          this.updatePreview();
        }
        this.cdr.detectChanges();
      });
    });
  }

  loadTemplates() {
    this.templateService.getAll().subscribe(data => {
      this.ngZone.run(() => {
        // Remove duplicates based on template ID
        const uniqueTemplates = data.filter((template, index, self) =>
          index === self.findIndex((t) => t.id === template.id)
        );

        this.templates = uniqueTemplates;

        // Load categories after templates are loaded
        this.loadCategories();
        this.cdr.detectChanges();
      });
    });
  }

  loadCategories() {
    // Load both message categories and template categories
    this.messageCategoryService.getCategories().subscribe(messageCategories => {
      this.ngZone.run(() => {
        // Get unique categories from templates
        const templateCategories = [...new Set(
          this.templates
            .map(t => t.category)
            .filter(cat => cat && cat.trim() !== '')
        )];

        // Merge both arrays and remove duplicates
        this.categories = [...new Set([...messageCategories, ...templateCategories])];

        this.cdr.detectChanges();
      });
    });
  }

  onCategoryChange() {
    // When category is selected, clear template and custom message
    if (this.selectedCategory) {
      this.selectedTemplate = null;
      this.customMessage = '';
      this.messagePreview = 'Messages will be randomized from the selected category';
    }
    this.cdr.detectChanges();
  }


  toggleCustomer(id: number) {
    const index = this.selectedCustomers.indexOf(id);
    if (index > -1) {
      // Deselect customer
      this.selectedCustomers.splice(index, 1);
    } else {
      // Check if limit reached before selecting
      if (this.selectedCustomers.length >= 3) {
        this.modalService.error('You cannot select more than 3 customers.\nPlease deselect a customer first.', 'Limit Reached');
        return;
      }
      this.selectedCustomers.push(id);
    }
    this.updatePreview();
    this.cdr.detectChanges();
  }

  selectAllCustomers() {
    if (this.selectedCustomers.length === this.customers.length) {
      this.selectedCustomers = [];
    } else {
      this.selectedCustomers = this.customers.map(c => c.id);
    }
    this.cdr.detectChanges();
  }

  onTemplateChange() {
    const template = this.templates.find(t => t.id === Number(this.selectedTemplate));
    if (template) {
      this.customMessage = template.body;
    }
    this.updatePreview();
  }

  updatePreview() {
    if (this.selectedCustomers.length > 0 && this.customMessage) {
      const customer = this.customers.find(c => c.id === this.selectedCustomers[0]);
      if (customer) {
        this.messagePreview = this.customMessage
          .replace(/{{name}}/g, customer.name)
          .replace(/{{phone}}/g, customer.phone);
      }
    } else {
      this.messagePreview = this.customMessage;
    }
    this.cdr.detectChanges();
  }

  sendMessage() {
    if (this.selectedCustomers.length === 0) {
      this.modalService.warning('Please select customers');
      return;
    }

    // Check customer limit (max 3)
    if (this.selectedCustomers.length > 3) {
      this.modalService.error('You cannot send to more than 3 customers.\nPlease deselect some customers to continue.', 'Limit Reached');
      return;
    }

    if (!this.selectedCategory && !this.customMessage) {
      this.modalService.warning('Please select a category or enter a message');
      return;
    }

    this.sending = true;

    if (this.selectedCustomers.length === 1 && !this.selectedCategory) {
      // Single message without category
      const customer = this.customers.find(c => c.id === this.selectedCustomers[0]);

      const body = this.customMessage
        .replace(/{{name}}/g, customer.name)
        .replace(/{{phone}}/g, customer.phone);

      const payload = {
        to_phone: customer.phone,
        body,
        template_id: this.selectedTemplate
      };

      this.messageService.send(payload).subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.modalService.success('Message queued successfully!');
            this.resetForm();
            this.sending = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.modalService.error('Failed to send message');
            this.sending = false;
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      // Batch sending (with or without category)
      const payload: any = {
        customer_ids: this.selectedCustomers,
        template_id: this.selectedTemplate,
        custom_body: this.customMessage
      };

      // If category is selected, add it to payload
      if (this.selectedCategory) {
        payload.category = this.selectedCategory;
        delete payload.custom_body; // Don't send custom_body when using category
        delete payload.template_id; // Don't use template when using category
      }

      this.messageService.sendBatch(payload).subscribe({
        next: (response) => {
          const msg = this.selectedCategory
            ? `${response.count} randomized messages queued with delays!`
            : `${response.count} messages queued successfully!`;
          this.modalService.success(msg);
          this.resetForm();
          this.sending = false;
        },
        error: () => {
          this.modalService.error('Failed to send messages');
          this.sending = false;
        }
      });
    }
  }

  resetForm() {
    this.selectedCustomers = [];
    this.selectedTemplate = null;
    this.selectedCategory = null;
    this.customMessage = '';
    this.messagePreview = '';
  }

  // TrackBy functions to prevent duplicates
  trackByTemplateId(index: number, template: any): number {
    return template.id;
  }

  trackByCategory(index: number, category: string): string {
    return category;
  }
}
