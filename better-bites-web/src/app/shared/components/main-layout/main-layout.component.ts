import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  label: string;
  icon: string;
  routerLink: string | string[];
  exact?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;

  readonly navLinks: NavLink[] = [
    { label: 'Dashboard', icon: 'solar:home-2-bold', routerLink: ['/dashboard'], exact: true },
    { label: 'Meals', icon: 'mdi:food', routerLink: ['/tracking', 'meals'] },
    { label: 'Water', icon: 'mdi:cup-water', routerLink: ['/tracking', 'water'] },
    { label: 'Activity', icon: 'lucide:dumbbell', routerLink: ['/tracking', 'activity'] },
    { label: 'Streaks', icon: 'solar:fire-bold', routerLink: ['/streaks'] },
    { label: 'Insights', icon: 'mdi:chart-line', routerLink: ['/insights'] },
  ];

  readonly adminLink: NavLink = {
    label: 'Admin',
    icon: 'mdi:shield-account',
    routerLink: ['/admin'],
  };

  readonly initials = computed(() => {
    const displayName = this.user()?.user_metadata?.['display_name'] ?? this.user()?.email ?? '';
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((segment: string) => segment.charAt(0).toUpperCase())
      .join('');
  });

  signOut() {
    void this.authService.signOut();
  }
}
