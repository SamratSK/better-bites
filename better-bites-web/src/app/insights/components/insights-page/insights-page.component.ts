import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { DailyLogService } from '../../../core/services/daily-log.service';

interface DailyChartPoint {
  dateLabel: string;
  logDate: string;
  calories: number;
  waterLiters: number;
  steps: number;
}

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-page.component.html',
  styleUrls: ['./insights-page.component.css'],
})
export class InsightsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly dailyLogService = inject(DailyLogService);

  readonly points = signal<DailyChartPoint[]>([]);
  readonly loading = signal(true);
  readonly calorieReference = 2400;
  readonly hydrationReferenceLiters = 3;
  readonly calorieAverage = computed(() => this.computeAverage((point) => point.calories));
  readonly hydrationAverage = computed(() => this.computeAverage((point) => point.waterLiters));
  readonly stepsAverage = computed(() => this.computeAverage((point) => point.steps));

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.loadWeeklyData(user.id);
      } else {
        this.points.set([]);
      }
    });
  }

  private async loadWeeklyData(userId: string) {
    this.loading.set(true);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    const summaries = await this.dailyLogService.listRange(userId, startIso, endIso);
    const summaryMap = new Map(summaries.map((summary) => [summary.logDate, summary]));

    const normalized: DailyChartPoint[] = [];
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const iso = day.toISOString().slice(0, 10);
      const summary = summaryMap.get(iso);

      normalized.push({
        dateLabel: day.toLocaleDateString(undefined, { weekday: 'short' }),
        logDate: iso,
        calories: summary?.caloriesConsumed ?? 0,
        waterLiters: (summary?.waterMl ?? 0) / 1000,
        steps: summary?.steps ?? 0,
      });
    }

    this.points.set(normalized);
    this.loading.set(false);
  }

  private computeAverage(selector: (point: DailyChartPoint) => number): number {
    const dataset = this.points();
    if (!dataset.length) {
      return 0;
    }
    const total = dataset.reduce((sum, entry) => sum + selector(entry), 0);
    return total / dataset.length;
  }
}
