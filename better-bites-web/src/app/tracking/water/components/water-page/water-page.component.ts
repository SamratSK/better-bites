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
  readonly manualAmount = signal<number | null>(null);

  readonly totalIntake = computed(() =>
    this.hydrationEntries().reduce((acc, entry) => acc + entry.volumeMl, 0)
  );
  readonly manualAmountValid = computed(() => {
    const value = this.manualAmount();
    return typeof value === 'number' && value > 0;
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refresh();
      }
    });
  }

  async refresh(force = false) {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    this.waterLoading.set(true);
    const entries = await this.waterService.listByDate(user.id, this.today(), { force });
    this.hydrationEntries.set(entries);
    this.waterLoading.set(false);
  }

  onManualAmountChange(value: string | number | null) {
    if (value === null || value === '') {
      this.manualAmount.set(null);
      return;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    this.manualAmount.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  async addWater(amount: number) {
    const user = this.authService.user();
    if (!user) {
      return;
    }

    await this.waterService.log(user.id, this.today(), amount);
    await this.refresh(true);
  }

  async addManualWater() {
    const amount = this.manualAmount();
    if (!amount || amount <= 0) {
      return;
    }
    await this.addWater(amount);
    this.manualAmount.set(null);
  }

  async deleteWater(entry: WaterEntry) {
    const user = this.authService.user();
    if (!user) {
      return;
    }

    const deleted = await this.waterService.delete(entry.id, user.id, this.today());
    if (deleted) {
      this.hydrationEntries.update((entries) => entries.filter((item) => item.id !== entry.id));
    }
  }
}
