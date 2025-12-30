import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalConfig {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private modalSubject = new Subject<ModalConfig & { id: string }>();
    private responseSubject = new Subject<{ id: string; confirmed: boolean }>();

    modal$ = this.modalSubject.asObservable();
    response$ = this.responseSubject.asObservable();

    show(config: ModalConfig): Promise<boolean> {
        const id = Math.random().toString(36).substring(7);

        return new Promise((resolve) => {
            const subscription = this.response$.subscribe((response) => {
                if (response.id === id) {
                    subscription.unsubscribe();
                    resolve(response.confirmed);
                }
            });

            this.modalSubject.next({ ...config, id });
        });
    }

    success(message: string, title: string = 'Success'): Promise<boolean> {
        return this.show({
            title,
            message,
            type: 'success',
            confirmText: 'OK',
            showCancel: false
        });
    }

    error(message: string, title: string = 'Error'): Promise<boolean> {
        return this.show({
            title,
            message,
            type: 'error',
            confirmText: 'OK',
            showCancel: false
        });
    }

    warning(message: string, title: string = 'Warning'): Promise<boolean> {
        return this.show({
            title,
            message,
            type: 'warning',
            confirmText: 'OK',
            showCancel: false
        });
    }

    info(message: string, title: string = 'Information'): Promise<boolean> {
        return this.show({
            title,
            message,
            type: 'info',
            confirmText: 'OK',
            showCancel: false
        });
    }

    confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
        return this.show({
            title,
            message,
            type: 'warning',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            showCancel: true
        });
    }

    respond(id: string, confirmed: boolean) {
        this.responseSubject.next({ id, confirmed });
    }
}
