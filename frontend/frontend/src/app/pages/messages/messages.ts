import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { MessageCategoryService } from '../../services/message-category';
import { TemplateService } from '../../services/template';

interface CategoryGroup {
    name: string;
    messages: any[];
    isExpanded: boolean;
}

@Component({
    selector: 'app-messages',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
    templateUrl: './messages.html',
    styleUrl: './messages.css'
})
export class MessagesComponent implements OnInit {
    categoryGroups: CategoryGroup[] = [];
    showModal: boolean = false;
    editingMessage: any = null;

    formData = {
        category: '',
        title: '',
        body: ''
    };

    previewBody: string = '';
    sampleData = { name: 'John Doe', phone: '1234567890' };

    constructor(
        private messageCategoryService: MessageCategoryService,
        private templateService: TemplateService,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadMessages();
    }

    loadMessages() {
        console.log('[MessagesComponent] Loading messages...');
        // Load message categories
        this.messageCategoryService.getAll().subscribe({
            next: (messageCategories) => {
                console.log('[MessagesComponent] Message categories loaded:', messageCategories);
                // Load templates
                this.templateService.getAll().subscribe({
                    next: (templates) => {
                        console.log('[MessagesComponent] Templates loaded:', templates);
                        // Combine and group by category
                        this.ngZone.run(() => {
                            this.groupMessagesByCategory(messageCategories, templates);
                            this.cdr.detectChanges();
                        });
                    },
                    error: (error) => {
                        console.error('[MessagesComponent] Error loading templates:', error);
                    }
                });
            },
            error: (error) => {
                console.error('[MessagesComponent] Error loading message categories:', error);
            }
        });
    }

    groupMessagesByCategory(messageCategories: any[], templates: any[]) {
        console.log('[MessagesComponent] Grouping messages...');
        console.log('Message categories count:', messageCategories.length);
        console.log('Templates count:', templates.length);

        const categoryMap = new Map<string, any[]>();

        // Add message categories
        messageCategories.forEach(msg => {
            if (!categoryMap.has(msg.category)) {
                categoryMap.set(msg.category, []);
            }
            categoryMap.get(msg.category)!.push({
                ...msg,
                source: 'message_category'
            });
        });

        // Add templates
        templates.forEach(tpl => {
            if (tpl.category && tpl.category.trim() !== '') {
                if (!categoryMap.has(tpl.category)) {
                    categoryMap.set(tpl.category, []);
                }
                categoryMap.get(tpl.category)!.push({
                    ...tpl,
                    source: 'template'
                });
            }
        });

        // Convert to array
        this.categoryGroups = Array.from(categoryMap.entries()).map(([name, messages]) => ({
            name,
            messages,
            isExpanded: true
        }));

        console.log('[MessagesComponent] Category groups created:', this.categoryGroups);
        console.log('[MessagesComponent] Total categories:', this.categoryGroups.length);
    }

    toggleCategory(category: CategoryGroup) {
        category.isExpanded = !category.isExpanded;
    }

    openModal(message?: any) {
        if (message) {
            this.editingMessage = message;
            this.formData = {
                category: message.category,
                title: message.title,
                body: message.body
            };
        } else {
            this.editingMessage = null;
            this.formData = { category: '', title: '', body: '' };
        }
        this.updatePreview();
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.editingMessage = null;
    }

    updatePreview() {
        this.previewBody = this.formData.body
            .replace(/{{name}}/g, this.sampleData.name)
            .replace(/{{phone}}/g, this.sampleData.phone);
    }

    saveMessage() {
        if (this.editingMessage) {
            // Update existing message
            console.log('[MessagesComponent] Updating existing message:', this.editingMessage.source);
            if (this.editingMessage.source === 'message_category') {
                this.messageCategoryService.update(this.editingMessage.id, this.formData).subscribe(() => {
                    this.loadMessages();
                    this.closeModal();
                });
            } else {
                this.templateService.update(this.editingMessage.id, this.formData).subscribe(() => {
                    this.loadMessages();
                    this.closeModal();
                });
            }
        } else {
            // Create new message (as message category, not template)
            console.log('[MessagesComponent] Creating NEW message as MESSAGE CATEGORY');
            console.log('[MessagesComponent] Form data:', this.formData);
            this.messageCategoryService.create(this.formData).subscribe({
                next: (response) => {
                    console.log('[MessagesComponent] Message created successfully:', response);
                    this.loadMessages();
                    this.closeModal();
                },
                error: (error) => {
                    console.error('[MessagesComponent] Error creating message:', error);
                }
            });
        }
    }

    deleteMessage(message: any) {
        if (confirm('Are you sure you want to delete this message?')) {
            if (message.source === 'message_category') {
                this.messageCategoryService.delete(message.id).subscribe(() => {
                    this.loadMessages();
                });
            } else {
                this.templateService.delete(message.id).subscribe(() => {
                    this.loadMessages();
                });
            }
        }
    }
}
