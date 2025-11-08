import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { AdminCounts, AdminService, FlaggedItemSummary } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrls: ['./admin-dashboard-page.component.css'],
})
export class AdminDashboardPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  readonly flaggedItems = signal<FlaggedItemSummary[]>([]);
  readonly summary = signal<AdminCounts | null>(null);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refreshDashboard();
      }
    });
  }

  private async refreshDashboard() {
    this.loading.set(true);
    const [counts, items] = await Promise.all([
      this.adminService.loadCounts(),
      this.adminService.fetchFlaggedItems(5),
    ]);
    this.summary.set(counts);
    this.flaggedItems.set(items);
    this.loading.set(false);
  }
}
