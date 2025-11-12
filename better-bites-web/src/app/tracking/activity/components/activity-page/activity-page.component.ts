import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/services/auth.service';
import { ActivityEntry, ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './activity-page.component.html',
  styleUrls: ['./activity-page.component.css'],
})
export class ActivityPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);

  readonly form = this.fb.nonNullable.group({
    activityType: ['Run', Validators.required],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
    intensity: ['moderate', Validators.required],
  });

  readonly activities = signal<ActivityEntry[]>([]);
  readonly loading = signal(false);
  readonly logDate = signal(new Date().toISOString().slice(0, 10));
  readonly totalCalories = computed(() =>
    this.activities().reduce((acc, entry) => acc + (entry.caloriesBurned ?? 0), 0)
  );

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refreshActivities();
      }
    });
  }

  async addActivity() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { activityType, durationMinutes, intensity } = this.form.getRawValue();
    const user = this.authService.user();
    if (!user) {
      return;
    }

    const calories = Math.round(
      durationMinutes * (intensity === 'high' ? 9 : intensity === 'moderate' ? 7 : 5)
    );

    await this.activityService.create({
      userId: user.id,
      logDate: this.logDate(),
      loggedAt: new Date().toISOString(),
      activityType,
      durationMin: durationMinutes,
      intensity,
      caloriesBurned: calories,
    });

    this.form.reset({
      activityType: 'Run',
      durationMinutes: 30,
      intensity: 'moderate',
    });

    await this.refreshActivities(true);
  }

  async refreshActivities(force = false) {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    this.loading.set(true);
    const entries = await this.activityService.listByDate(user.id, this.logDate(), { force });
    this.activities.set(entries);
    this.loading.set(false);
  }
}
