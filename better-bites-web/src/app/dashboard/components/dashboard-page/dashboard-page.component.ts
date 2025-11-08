import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { MotivationService } from '../../../core/services/motivation.service';
import { ProfileService } from '../../../core/services/profile.service';
import { StreakService } from '../../../core/services/streak.service';
import { DailyLogService, DailySummary } from '../../../core/services/daily-log.service';
import { AvatarCanvasComponent } from '../../../shared/components/avatar-canvas/avatar-canvas.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarCanvasComponent, TitleCasePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css'],
})
export class DashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly motivationService = inject(MotivationService);
  private readonly streakService = inject(StreakService);
  private readonly dailyLogService = inject(DailyLogService);

  readonly profile = this.profileService.profile;
  readonly goals = this.profileService.dailyGoals;
  readonly measurement = this.profileService.latestMeasurement;
  readonly streaks = this.streakService.streaks;
  readonly messages = this.motivationService.messages;
  readonly tips = this.motivationService.tips;
  readonly today = signal(new Date().toISOString().slice(0, 10));
  readonly todaySummary = signal<DailySummary | null>(null);
  readonly summaryLoading = signal(true);

  readonly bmi = computed(() => this.measurement()?.bmi ?? 22);
  readonly bmiCategory = computed(() => {
    const bmi = this.bmi();
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  });
  readonly caloriesConsumed = computed(() => this.todaySummary()?.caloriesConsumed ?? 0);
  readonly calorieTarget = computed(() => this.goals()?.caloriesTarget ?? null);
  readonly hydrationLiters = computed(() => (this.todaySummary()?.waterMl ?? 0) / 1000);
  readonly hydrationTargetLiters = computed(() => (this.goals()?.waterMlTarget ?? 0) / 1000);
  readonly activityMinutes = computed(() => Math.round((this.todaySummary()?.steps ?? 0) / 100));
  readonly stepsTarget = computed(() => this.goals()?.stepsTarget ?? null);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.profileService.loadProfile(user.id);
        void this.profileService.loadDailyGoals(user.id);
        void this.profileService.loadLatestMeasurement(user.id);
        void this.streakService.refresh(user.id);
        void this.motivationService.loadActiveContent();
        void this.loadDailySummary(user.id);
      }
    });
  }

  private async loadDailySummary(userId: string) {
    this.summaryLoading.set(true);
    const summary = await this.dailyLogService.getSummary(userId, this.today());
    this.todaySummary.set(summary);
    this.summaryLoading.set(false);
  }
}
