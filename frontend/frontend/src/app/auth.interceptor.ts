import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const token = localStorage.getItem('token');

    // Prepend base URL for API requests
    let url = req.url;
    if (url.startsWith('/api')) {
        url = environment.apiUrl.replace('/api', '') + url;
    }

    console.log('[AuthInterceptor] Request:', url, 'Has token:', !!token);

    const clonedReq = req.clone({
        url: url,
        setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
    });

    return next(clonedReq).pipe(
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
};
