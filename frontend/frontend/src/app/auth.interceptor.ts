import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const token = localStorage.getItem('token');

    console.log('[AuthInterceptor] Request:', req.url, 'Has token:', !!token);

    if (token) {
        const cloned = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });

        return next(cloned).pipe(
            catchError((error) => {
                if (error.status === 401) {
                    console.error('[AuthInterceptor] 401 Unauthorized - redirecting to login');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.navigate(['/login']);
                }
                return throwError(() => error);
            })
        );
    }

    return next(req).pipe(
        catchError((error) => {
            if (error.status === 401) {
                console.error('[AuthInterceptor] 401 Unauthorized (no token) - redirecting to login');
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
