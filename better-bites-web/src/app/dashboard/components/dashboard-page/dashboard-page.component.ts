import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { MotivationService } from '../../../core/services/motivation.service';
import { ProfileService } from '../../../core/services/profile.service';
import { StreakService } from '../../../core/services/streak.service';
import { DailyLogService, DailySummary } from '../../../core/services/daily-log.service';

interface ChecklistItem {
  label: string;
  current: number;
  target: number;
  percent: number;
  complete: boolean;
  routerLink: string | string[];
  displayTarget: number | null;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TitleCasePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css'],
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly motivationService = inject(MotivationService);
  private readonly streakService = inject(StreakService);
  private readonly dailyLogService = inject(DailyLogService);
  private readonly router = inject(Router);
  private routeSub: Subscription | null = null;
  private readonly dataLoadedFor = new Set<string>();

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
  readonly bmiPercent = computed(() => {
    const bmi = this.bmi();
    const min = 15;
    const under = 18.5;
    const healthy = 25;
    const over = 30;
    const obese1 = 35;
    const obese2 = 40;
    const max = 45;

    const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
    const lerp = (value: number, start: number, end: number, outputStart: number, outputEnd: number) =>
      outputStart + ((value - start) / (end - start)) * (outputEnd - outputStart);

    if (bmi <= under) {
      return lerp(clamp(bmi, min, under), min, under, 0, 18);
    }
    if (bmi <= healthy) {
      return lerp(bmi, under, healthy, 18, 50);
    }
    if (bmi <= over) {
      return lerp(bmi, healthy, over, 50, 68);
    }
    if (bmi <= obese1) {
      return lerp(bmi, over, obese1, 68, 82);
    }
    if (bmi <= obese2) {
      return lerp(bmi, obese1, obese2, 82, 92);
    }
    return lerp(clamp(bmi, obese2, max), obese2, max, 92, 100);
  });
  readonly bmiCategory = computed(() => {
    const bmi = this.bmi();
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    if (bmi < 35) return 'Obesity Class I';
    if (bmi < 40) return 'Obesity Class II';
    return 'Obesity Class III';
  });
  readonly caloriesConsumed = computed(() => this.todaySummary()?.caloriesConsumed ?? 0);
  readonly calorieTarget = computed(() => this.goals()?.caloriesTarget ?? null);
  readonly hydrationLiters = computed(() => (this.todaySummary()?.waterMl ?? 0) / 1000);
  readonly hydrationTargetLiters = computed(() => (this.goals()?.waterMlTarget ?? 0) / 1000);
  readonly activityMinutes = computed(() => Math.round((this.todaySummary()?.steps ?? 0) / 100));
  readonly stepsTarget = computed(() => this.goals()?.stepsTarget ?? null);
  readonly checklistItems = computed<ChecklistItem[]>(() => {
    const summary = this.todaySummary();
    const goals = this.goals();
    return [
      this.buildChecklistItem('Meals goal', summary?.caloriesConsumed ?? 0, goals?.caloriesTarget ?? 0, ['/tracking', 'meals']),
      this.buildChecklistItem('Hydration goal', summary?.waterMl ?? 0, goals?.waterMlTarget ?? 0, ['/tracking', 'water']),
      this.buildChecklistItem('Activity goal', summary?.steps ?? 0, goals?.stepsTarget ?? 6000, ['/tracking', 'activity']),
    ];
  });

  ngOnInit(): void {
    this.handleNavigation(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.handleNavigation(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private handleNavigation(url: string) {
    if (!url.startsWith('/dashboard')) {
      return;
    }
    const user = this.authService.user();
    if (user) {
      this.initializeData(user.id);
    }
  }

  private initializeData(userId: string) {
    if (!this.dataLoadedFor.has(userId)) {
      void this.profileService.loadProfile(userId);
      void this.profileService.loadDailyGoals(userId);
      void this.profileService.loadLatestMeasurement(userId);
      void this.streakService.refresh(userId);
      void this.motivationService.loadActiveContent();
      this.dataLoadedFor.add(userId);
    }
    void this.loadDailySummary(userId);
  }

  private async loadDailySummary(userId: string) {
    this.summaryLoading.set(true);
    const summary = await this.dailyLogService.getSummary(userId, this.today());
    this.todaySummary.set(summary);
    this.summaryLoading.set(false);
  }

  private buildChecklistItem(label: string, current: number, target: number, routerLink: string | string[]): ChecklistItem {
    const hasTarget = target > 0;
    const safeTarget = hasTarget ? target : Math.max(current, 1);
    const percent = hasTarget ? Math.min(Math.round((current / safeTarget) * 100), 100) : current > 0 ? 100 : 0;
    return {
      label,
      current,
      target: safeTarget,
      percent,
      complete: hasTarget ? current >= target : current > 0,
      routerLink,
      displayTarget: hasTarget ? target : null,
    };
  }
}
