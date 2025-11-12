import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService, AuthRole } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css'],
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  readonly profile = this.profileService.profile;
  readonly goals = this.profileService.dailyGoals;
  readonly latestMeasurement = this.profileService.latestMeasurement;
  readonly isAdmin = this.authService.isAdmin;

  readonly profileSaving = signal(false);
  readonly goalsSaving = signal(false);
  readonly measurementSaving = signal(false);
  readonly profileFeedback = signal<string | null>(null);
  readonly goalsFeedback = signal<string | null>(null);
  readonly measurementFeedback = signal<string | null>(null);

  readonly profileForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    gender: ['prefer_not_to_say', Validators.required],
    avatarPreference: ['male', Validators.required],
    activityLevel: ['moderate', Validators.required],
    timezone: [{ value: Intl.DateTimeFormat().resolvedOptions().timeZone, disabled: true }],
    dateOfBirth: [''],
    role: ['member', Validators.required],
  });

  readonly goalsForm = this.fb.nonNullable.group({
    caloriesTarget: [2000, [Validators.required, Validators.min(800)]],
    proteinTarget: [100, [Validators.min(0)]],
    carbsTarget: [250, [Validators.min(0)]],
    fatTarget: [70, [Validators.min(0)]],
    waterMlTarget: [2500, [Validators.required, Validators.min(500)]],
    stepsTarget: [8000, [Validators.min(0)]],
  });

  readonly measurementForm = this.fb.group({
    heightCm: [170, [Validators.required, Validators.min(80), Validators.max(250)]],
    weightKg: [70, [Validators.required, Validators.min(20), Validators.max(300)]],
    bodyFatPct: this.fb.control<number | null>(null),
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.profileService.loadProfile(user.id);
        void this.profileService.loadDailyGoals(user.id);
        void this.profileService.loadLatestMeasurement(user.id);
      }
    });

    effect(() => {
      const profile = this.profile();
      if (profile) {
        this.profileForm.patchValue(
          {
            displayName: profile.displayName,
            gender: profile.gender,
            avatarPreference: profile.avatarPreference,
            activityLevel: profile.activityLevel,
            timezone: profile.timezone,
            dateOfBirth: profile.dateOfBirth ?? '',
            role: profile.role,
          },
          { emitEvent: false }
        );
      }
    });

    effect(() => {
      const admin = this.isAdmin();
      if (admin) {
        this.profileForm.get('role')?.enable({ emitEvent: false });
      } else {
        this.profileForm.get('role')?.disable({ emitEvent: false });
      }
    });

    effect(() => {
      const goals = this.goals();
      if (goals) {
        this.goalsForm.patchValue(
          {
            caloriesTarget: goals.caloriesTarget,
            proteinTarget: goals.proteinTarget ?? 0,
            carbsTarget: goals.carbsTarget ?? 0,
            fatTarget: goals.fatTarget ?? 0,
            waterMlTarget: goals.waterMlTarget,
            stepsTarget: goals.stepsTarget ?? 0,
          },
          { emitEvent: false }
        );
      }
    });

    effect(() => {
      const measurement = this.latestMeasurement();
      if (measurement) {
        this.measurementForm.patchValue(
          {
            heightCm: measurement.heightCm,
            weightKg: measurement.weightKg,
            bodyFatPct: measurement.bodyFatPct,
          },
          { emitEvent: false }
        );
      }
    });
  }

  async saveProfile() {
    this.profileFeedback.set(null);
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user) {
      this.profileFeedback.set('You need to be signed in to update your profile.');
      return;
    }

    this.profileSaving.set(true);
    const { displayName, gender, avatarPreference, activityLevel, dateOfBirth, role } = this.profileForm.getRawValue();
    try {
      await this.profileService.updateProfile(user.id, {
        displayName: displayName.trim(),
        gender: gender as any,
        avatarPreference: avatarPreference as any,
        activityLevel: activityLevel as any,
        timezone: this.profileForm.getRawValue().timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateOfBirth: dateOfBirth || null,
        role: this.isAdmin() ? (role as AuthRole) : undefined,
      });
      if (this.isAdmin()) {
        await this.authService.refreshRole();
      }
      this.profileFeedback.set('Profile updated successfully.');
    } catch (error: any) {
      this.profileFeedback.set(error?.message ?? 'Failed to update profile.');
    } finally {
      this.profileSaving.set(false);
    }
  }

  async saveGoals() {
    this.goalsFeedback.set(null);
    if (this.goalsForm.invalid) {
      this.goalsForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user) {
      this.goalsFeedback.set('You need to be signed in to update goals.');
      return;
    }

    this.goalsSaving.set(true);
    try {
      await this.profileService.updateDailyGoals(user.id, this.goalsForm.getRawValue());
      this.goalsFeedback.set('Daily goals updated.');
    } catch (error: any) {
      this.goalsFeedback.set(error?.message ?? 'Failed to update goals.');
    } finally {
      this.goalsSaving.set(false);
    }
  }

  async logMeasurement() {
    this.measurementFeedback.set(null);
    if (this.measurementForm.invalid) {
      this.measurementForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user) {
      this.measurementFeedback.set('You need to be signed in to log measurements.');
      return;
    }

    this.measurementSaving.set(true);
    const { heightCm, weightKg, bodyFatPct } = this.measurementForm.getRawValue() as {
      heightCm: number;
      weightKg: number;
      bodyFatPct: number | null;
    };
    try {
      await this.profileService.logMeasurement(user.id, {
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        bodyFatPct: bodyFatPct !== null ? Number(bodyFatPct) : null,
      });
      this.measurementFeedback.set('Measurement saved.');
    } catch (error: any) {
      this.measurementFeedback.set(error?.message ?? 'Failed to log measurement.');
    } finally {
      this.measurementSaving.set(false);
    }
  }
}
