import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { ChatService } from '../../services/chat';
import { SocketService } from '../../services/socket';
import { ModalService } from '../../services/modal.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
    templateUrl: './chat.html',
    styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    conversations: any[] = [];
    selectedChat: any = null;
    messages: any[] = [];
    newMessage: string = '';
    loading = false;
    sending = false;
    searchTerm: string = '';

    @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

    private socketSub?: Subscription;

    constructor(
        private chatService: ChatService,
        private socketService: SocketService,
        private modalService: ModalService,
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone
    ) { }

    ngOnInit() {
        this.loadConversations();
        this.setupSocketListeners();
    }

    ngOnDestroy() {
        this.socketSub?.unsubscribe();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        setTimeout(() => {
            try {
                if (this.myScrollContainer) {
                    this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
                }
            } catch (err) { }
        }, 100);
    }

    loadConversations() {
        this.loading = true;
        this.chatService.getConversations().subscribe({
            next: (res: any) => {
                this.ngZone.run(() => {
                    this.conversations = res.conversations || [];
                    this.loading = false;
                    console.log('[ChatComponent] Loaded conversations:', this.conversations.length);
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                this.ngZone.run(() => {
                    console.error('Failed to load conversations', err);
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    selectChat(chat: any) {
        this.selectedChat = chat;
        this.messages = [];
        this.loadHistory(chat.phone);
        this.cdr.detectChanges();
    }

    loadHistory(phone: string) {
        this.chatService.getHistory(phone).subscribe({
            next: (res: any) => {
                this.ngZone.run(() => {
                    this.messages = res.messages || [];
                    console.log('[ChatComponent] Loaded history for', phone, 'count:', this.messages.length);
                    this.scrollToBottom();
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                this.ngZone.run(() => {
                    console.error('Failed to load history', err);
                    this.cdr.detectChanges();
                });
            }
        });
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.selectedChat) return;

        const text = this.newMessage.trim();
        this.newMessage = ''; // Clear immediately
        this.sending = true;

        // Optimistic update
        const tempMsg = {
            from_me: true,
            body: text,
            timestamp: new Date(),
            status: 'sending'
        };
        this.messages.push(tempMsg);

        this.http.post('/api/send-message', { phone: this.selectedChat.phone, text }).subscribe({
            next: (res: any) => {
                this.sending = false;
                tempMsg.status = 'sent';
                // Refresh history to get exact DB state or just leave optimistic
            },
            error: (err) => {
                this.sending = false;
                tempMsg.status = 'failed';
                this.modalService.error('Failed to send message');
            }
        });
    }

    setupSocketListeners() {
        this.socketSub = this.socketService.onMessage().subscribe((data: any) => {
            this.ngZone.run(() => {
                console.log('[ChatComponent] New message received:', data);

                // Update conversation list last message
                const conv = this.conversations.find(c => c.phone === data.phone);
                if (conv) {
                    conv.lastMessage = {
                        body: data.body,
                        timestamp: data.timestamp,
                        from_me: data.from_me
                    };
                    // Move to top
                    this.conversations = [conv, ...this.conversations.filter(c => c.phone !== data.phone)];
                } else {
                    // New conversation (reload or add manually if we have customer details)
                    this.loadConversations();
                }

                // If chat is open, append message
                if (this.selectedChat && this.selectedChat.phone === data.phone) {
                    // Check if message already exists (fuzzy match for timestamp to handle optimistic updates)
                    const exists = this.messages.some(m => {
                        if (m.body !== data.body) return false;
                        if (m.from_me !== data.from_me) return false;

                        const t1 = new Date(m.timestamp).getTime();
                        const t2 = new Date(data.timestamp).getTime();
                        return Math.abs(t1 - t2) < 2000; // Within 2 seconds
                    });

                    if (!exists) {
                        this.messages.push(data);
                        this.scrollToBottom();
                    } else {
                        // Update status of existing message if needed
                        const existing = this.messages.find(m => m.body === data.body && Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000);
                        if (existing) {
                            existing.status = 'sent'; // Confirm it's sent
                            existing.timestamp = data.timestamp; // Sync timestamp
                        }
                    }
                }

                this.cdr.detectChanges();
            });
        });
    }

    get filteredConversations() {
        if (!this.searchTerm) return this.conversations;
        return this.conversations.filter(c =>
            c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            c.phone.includes(this.searchTerm)
        );
    }

    // Group messages by date for displaying date separators
    get groupedMessages() {
        const grouped: any[] = [];

        // Safety check: ensure messages array exists and is not empty
        if (!this.messages || this.messages.length === 0) {
            return grouped;
        }

        // Sort messages by timestamp (oldest first) to ensure date separators are in correct order
        const sortedMessages = [...this.messages].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt).getTime();
            const dateB = new Date(b.timestamp || b.createdAt).getTime();
            return dateA - dateB;
        });

        let lastDate: string | null = null;

        sortedMessages.forEach(msg => {
            // Safety check: ensure message has a valid timestamp or createdAt
            if (!msg || (!msg.timestamp && !msg.createdAt)) {
                console.warn('[ChatComponent] Message missing timestamp and createdAt:', msg);
                return;
            }

            // Use timestamp if available, otherwise fall back to createdAt
            const msgDate = new Date(msg.timestamp || msg.createdAt);

            // Safety check: ensure valid date
            if (isNaN(msgDate.getTime())) {
                console.warn('[ChatComponent] Invalid timestamp:', msg.timestamp || msg.createdAt);
                return;
            }

            const dateStr = this.formatDateSeparator(msgDate);

            if (dateStr !== lastDate) {
                grouped.push({
                    type: 'date-separator',
                    date: dateStr,
                    fullDate: msgDate
                });
                lastDate = dateStr;
            }

            grouped.push({
                ...msg,
                type: 'message',  // MUST be after ...msg to override any existing type property
                timestamp: msg.timestamp || msg.createdAt  // Ensure timestamp is always set
            });
        });

        return grouped;
    }

    // Format date separator like WhatsApp
    formatDateSeparator(date: Date): string {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const msgDate = new Date(date);

        msgDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);

        if (msgDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (msgDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            // Format as "DD/MM/YYYY" or use locale format
            const day = msgDate.getDate().toString().padStart(2, '0');
            const month = (msgDate.getMonth() + 1).toString().padStart(2, '0');
            const year = msgDate.getFullYear();
            return `${day}/${month}/${year}`;
        }
    }
}
