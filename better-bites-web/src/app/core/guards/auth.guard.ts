import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }

  if (auth.isLoading()) {
    return new Promise<boolean>((resolve) => {
      const interval = setInterval(() => {
        if (!auth.isLoading()) {
          clearInterval(interval);
          resolve(auth.isAuthenticated());
        }
      }, 100);
    }).then((isLoggedIn) => (isLoggedIn ? true : router.createUrlTree(['/auth/login'])));
  }

  return router.createUrlTree(['/auth/login']);
};
