import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../services/modal.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.html',
    styleUrls: ['./modal.css']
})
export class ModalComponent implements OnInit, OnDestroy {
    isVisible = false;
    config: ModalConfig & { id: string } | null = null;
    private subscription?: Subscription;

    constructor(private modalService: ModalService) { }

    ngOnInit() {
        this.subscription = this.modalService.modal$.subscribe((config) => {
            this.config = config;
            this.isVisible = true;
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    onConfirm() {
        if (this.config) {
            this.modalService.respond(this.config.id, true);
        }
        this.close();
    }

    onCancel() {
        if (this.config) {
            this.modalService.respond(this.config.id, false);
        }
        this.close();
    }

    close() {
        this.isVisible = false;
        setTimeout(() => {
            this.config = null;
        }, 300);
    }

    getIcon(): string {
        switch (this.config?.type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info': return 'ℹ';
            default: return 'ℹ';
        }
    }

    getIconColor(): string {
        switch (this.config?.type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#3b82f6';
            default: return '#3b82f6';
        }
    }
}
