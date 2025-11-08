import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadChildren: () => import('./onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/components/dashboard-page/dashboard-page.component').then(
            (m) => m.DashboardPageComponent,
          ),
        title: 'Dashboard | Better Bites',
      },
      {
        path: 'tracking/meals',
        loadComponent: () =>
          import('./tracking/meals/components/meals-page/meals-page.component').then((m) => m.MealsPageComponent),
        title: 'Meals | Better Bites',
      },
      {
        path: 'tracking/water',
        loadComponent: () =>
          import('./tracking/water/components/water-page/water-page.component').then((m) => m.WaterPageComponent),
        title: 'Hydration | Better Bites',
      },
      {
        path: 'tracking/activity',
        loadComponent: () =>
          import('./tracking/activity/components/activity-page/activity-page.component').then(
            (m) => m.ActivityPageComponent,
          ),
        title: 'Activity | Better Bites',
      },
      {
        path: 'streaks',
        loadComponent: () =>
          import('./streaks/components/streaks-page/streaks-page.component').then((m) => m.StreaksPageComponent),
        title: 'Streaks | Better Bites',
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('./insights/components/insights-page/insights-page.component').then(
            (m) => m.InsightsPageComponent,
          ),
        title: 'Insights | Better Bites',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/components/settings-page/settings-page.component').then(
            (m) => m.SettingsPageComponent,
          ),
        title: 'Settings | Better Bites',
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./admin/components/admin-dashboard-page/admin-dashboard-page.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
        title: 'Admin | Better Bites',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
