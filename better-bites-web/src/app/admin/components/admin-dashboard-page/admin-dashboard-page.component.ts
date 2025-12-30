import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AdminCounts, AdminService, AdminUser, FlaggedItemSummary } from '../../../core/services/admin.service';

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
  private readonly router = inject(Router);

  readonly flaggedItems = signal<FlaggedItemSummary[]>([]);
  readonly summary = signal<AdminCounts | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly deletingUserId = signal<string | null>(null);

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
    const [adminData, items] = await Promise.all([
      this.adminService.fetchAdminUsers(),
      this.adminService.fetchFlaggedItems(5),
    ]);
    if (adminData) {
      this.summary.set(adminData.counts);
      this.users.set(adminData.users);
    }
    this.flaggedItems.set(items);
    this.loading.set(false);
  }

  async viewReport(user: AdminUser) {
    await this.router.navigate(['/admin/report', user.userId]);
  }

  async deleteUser(user: AdminUser) {
    if (!confirm(`Delete ${user.displayName}? This permanently removes the user.`)) {
      return;
    }
    this.deletingUserId.set(user.userId);
    const deleted = await this.adminService.deleteUser(user.userId);
    if (deleted) {
      this.users.update((entries) => entries.filter((entry) => entry.userId !== user.userId));
      await this.refreshDashboard();
    }
    this.deletingUserId.set(null);
  }
}
