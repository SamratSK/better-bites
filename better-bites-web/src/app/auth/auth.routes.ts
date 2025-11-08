import { Routes } from '@angular/router';

import { AuthLayoutComponent } from '../shared/components/auth-layout/auth-layout.component';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { RegisterPageComponent } from './components/register-page/register-page.component';
import { guestGuard } from '../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        component: LoginPageComponent,
        title: 'Sign in | Better Bites',
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        component: RegisterPageComponent,
        title: 'Create Account | Better Bites',
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },
];
