import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding-page.component.html',
  styleUrls: ['./onboarding-page.component.css'],
})
export class OnboardingPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    gender: ['prefer_not_to_say'],
    avatarPreference: ['male'],
    heightCm: [170, [Validators.required, Validators.min(100), Validators.max(250)]],
    weightKg: [70, [Validators.required, Validators.min(30), Validators.max(250)]],
    dateOfBirth: ['', [Validators.required]],
    activityLevel: ['moderate', Validators.required],
    caloriesTarget: [2200, [Validators.required, Validators.min(1000)]],
    waterMlTarget: [2500, [Validators.required, Validators.min(500)]],
    stepsTarget: [8000, [Validators.min(0)]],
  });

  async completeOnboarding() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const session = this.authService.getSessionSnapshot();

    if (!session?.user) {
      this.isSubmitting.set(false);
      return;
    }

    const userId = session.user.id;
    const {
      displayName,
      gender,
      avatarPreference,
      heightCm,
      weightKg,
      dateOfBirth,
      activityLevel,
      caloriesTarget,
      waterMlTarget,
      stepsTarget,
    } = this.form.getRawValue();

    try {
      await this.profileService.updateProfile(userId, {
        displayName,
        gender: gender as any,
        avatarPreference: avatarPreference as any,
        activityLevel: activityLevel as any,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateOfBirth: dateOfBirth || null,
      });

      await this.profileService.logMeasurement(userId, {
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });

      await this.profileService.updateDailyGoals(userId, {
        caloriesTarget,
        waterMlTarget,
        stepsTarget: stepsTarget ?? undefined,
      });

      await this.router.navigate(['/dashboard']);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
