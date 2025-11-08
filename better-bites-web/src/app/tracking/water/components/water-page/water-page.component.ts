import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { ProfileService } from '../../../../core/services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WaterEntry, WaterService } from '../../services/water.service';

@Component({
  selector: 'app-water-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './water-page.component.html',
  styleUrls: ['./water-page.component.css'],
})
export class WaterPageComponent {
  private readonly profileService = inject(ProfileService);
  private readonly waterService = inject(WaterService);
  private readonly authService = inject(AuthService);

  readonly goals = this.profileService.dailyGoals;
  readonly hydrationEntries = signal<WaterEntry[]>([]);
  readonly waterLoading = signal(false);
  readonly today = signal(new Date().toISOString().slice(0, 10));

  readonly totalIntake = computed(() =>
    this.hydrationEntries().reduce((acc, entry) => acc + entry.volumeMl, 0)
  );

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refresh();
      }
    });
  }

  async refresh() {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    this.waterLoading.set(true);
    const entries = await this.waterService.listByDate(user.id, this.today());
    this.hydrationEntries.set(entries);
    this.waterLoading.set(false);
  }

  async addWater(amount: number) {
    const user = this.authService.user();
    if (!user) {
      return;
    }

    await this.waterService.log(user.id, amount);
    await this.refresh();
  }
}
