import { Component, effect, computed, inject, signal, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TitleCasePipe } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { DailyLogService, DailySummary } from '../../../core/services/daily-log.service';
import { MealService } from '../../../tracking/meals/services/meal.service';
import { WaterService } from '../../../tracking/water/services/water.service';
import { ActivityService } from '../../../tracking/activity/services/activity.service';

interface NavLink {
  label: string;
  icon: string;
  routerLink: string | string[];
  exact?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly dailyLogService = inject(DailyLogService);
  private readonly router = inject(Router);
  private readonly mealService = inject(MealService);
  private readonly waterService = inject(WaterService);
  private readonly activityService = inject(ActivityService);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;
  readonly goals = this.profileService.dailyGoals;
  readonly profile = this.profileService.profile;
  readonly today = signal(new Date().toISOString().slice(0, 10));
  readonly todaySummary = signal<DailySummary | null>(null);
  readonly pulseLoading = signal(true);
  private lastSummaryKey: string | null = null;

  readonly navLinks: NavLink[] = [
    { label: 'Dashboard', icon: 'solar:home-2-bold', routerLink: ['/dashboard'], exact: true },
    { label: 'Meals', icon: 'mdi:food', routerLink: ['/tracking', 'meals'] },
    { label: 'Water', icon: 'mdi:cup-water', routerLink: ['/tracking', 'water'] },
    { label: 'Activity', icon: 'lucide:dumbbell', routerLink: ['/tracking', 'activity'] },
    { label: 'Report', icon: 'mdi:file-chart-outline', routerLink: ['/report'] },
    { label: 'Insights', icon: 'mdi:chart-line', routerLink: ['/insights'] },
    { label: 'Settings', icon: 'mdi:cog', routerLink: ['/settings'] },
  ];

  readonly adminLink: NavLink = {
    label: 'Admin',
    icon: 'mdi:shield-account',
    routerLink: ['/admin'],
  };

  readonly displayName = computed(() => {
    return this.profile()?.displayName ?? this.user()?.user_metadata?.['display_name'] ?? this.user()?.email ?? 'Athlete';
  });

  readonly initials = computed(() => {
    const displayName = this.displayName();
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((segment: string) => segment.charAt(0).toUpperCase())
      .join('');
  });
  readonly progressPulse = computed(() => {
    const summary = this.todaySummary();
    const goalSnapshot = this.goals();

    const caloriesTarget = goalSnapshot?.caloriesTarget ?? 0;
    const waterTarget = goalSnapshot?.waterMlTarget ?? 0;
    const stepsTarget = goalSnapshot?.stepsTarget ?? 0;

    const stats = [
      {
        label: 'meals',
        current: summary?.caloriesConsumed ?? 0,
        target: caloriesTarget,
      },
      {
        label: 'hydration',
        current: summary?.waterMl ?? 0,
        target: waterTarget,
      },
      {
        label: 'activity',
        current: summary?.steps ?? 0,
        target: stepsTarget,
      },
    ].filter((entry) => entry.target > 0);

    if (!stats.length) {
      return {
        percent: 0,
        highlight: 'Set goals',
        message: 'Add calorie, hydration, and step targets to unlock coaching insights.',
      };
    }

    const normalizedRatios = stats.map((entry) => Math.min(entry.current / entry.target, 1));
    const percent = Math.round((normalizedRatios.reduce((sum, ratio) => sum + ratio, 0) / normalizedRatios.length) * 100);

    const weakest = stats.reduce((prev, curr) =>
      curr.current / curr.target < prev.current / prev.target ? curr : prev
    );

    let message = '';
    if (percent >= 90) {
      message = 'Everything is on track. Keep the momentum shining.';
    } else if (percent >= 60) {
      message = `Add a little more ${weakest.label} to finish strong.`;
    } else {
      message = `Start with ${weakest.label} next to spark a comeback.`;
    }

    return { percent, highlight: weakest.label, message };
  });

  private readonly syncEffect = effect(() => {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    if (!this.profileService.profile()) {
      void this.profileService.loadProfile(user.id);
    }
    const goalsSnapshot = this.profileService.dailyGoals();
    if (!goalsSnapshot) {
      void this.profileService.loadDailyGoals(user.id);
    }

    const summaryKey = `${user.id}-${this.today()}-${this.mealService.version()}-${this.waterService.version()}-${this.activityService.version()}`;
    if (this.lastSummaryKey !== summaryKey) {
      this.lastSummaryKey = summaryKey;
      void this.loadSummary(user.id);
    }
  });

  ngOnDestroy(): void {
    this.syncEffect.destroy();
  }

  async signOut() {
    await this.authService.signOut();
    await this.router.navigate(['/auth/login']);
  }

  private async loadSummary(userId: string) {
    this.pulseLoading.set(true);
    const summary = await this.dailyLogService.getSummary(userId, this.today());
    this.todaySummary.set(summary);
    this.pulseLoading.set(false);
  }
}
