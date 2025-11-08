import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { ENVIRONMENT } from '../tokens/environment.token';
import { SupabaseClientService } from './supabase-client.service';

export interface Profile {
  userId: string;
  displayName: string;
  gender: 'male' | 'female' | 'non-binary' | 'prefer_not_to_say';
  timezone: string;
  avatarPreference: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  dateOfBirth?: string | null;
}

export interface DailyGoals {
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterMlTarget: number;
  stepsTarget?: number;
}

export interface BodyMeasurement {
  id: string;
  recordedAt: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bodyFatPct?: number | null;
}

export interface ProfileUpsertPayload {
  displayName: string;
  gender: Profile['gender'];
  timezone: string;
  avatarPreference: Profile['avatarPreference'];
  activityLevel: Profile['activityLevel'];
  dateOfBirth?: string | null;
}

export interface BodyMeasurementInput {
  heightCm: number;
  weightKg: number;
  recordedAt?: string;
  bodyFatPct?: number | null;
  waistCm?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).clientInstance;
  private readonly env = inject(ENVIRONMENT);

  private readonly profileSignal = signal<Profile | null>(null);
  private readonly dailyGoalsSignal = signal<DailyGoals | null>(null);
  private readonly latestMeasurementSignal = signal<BodyMeasurement | null>(null);

  readonly profile = computed(() => this.profileSignal());
  readonly dailyGoals = computed(() => this.dailyGoalsSignal());
  readonly latestMeasurement = computed(() => this.latestMeasurementSignal());

  async loadProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile', error.message);
      return;
    }

    if (data) {
      this.profileSignal.set({
        userId,
        displayName: data.display_name,
        gender: data.gender,
        timezone: data.timezone,
        avatarPreference: data.avatar_preference,
        activityLevel: data.activity_level,
        dateOfBirth: data.date_of_birth,
      });
    }
  }

  async loadDailyGoals(userId: string) {
    const { data, error } = await this.supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load daily goals', error.message);
      return;
    }

    if (data) {
      this.dailyGoalsSignal.set({
        caloriesTarget: data.calories_target,
        proteinTarget: data.protein_target,
        carbsTarget: data.carbs_target,
        fatTarget: data.fat_target,
        waterMlTarget: data.water_ml_target,
        stepsTarget: data.steps_target ?? undefined,
      });
    }
  }

  async updateProfile(userId: string, payload: ProfileUpsertPayload) {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: payload.displayName,
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth ?? null,
        timezone: payload.timezone,
        avatar_preference: payload.avatarPreference,
        activity_level: payload.activityLevel,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile', error.message);
      return;
    }

    this.profileSignal.set({
      userId,
      displayName: data.display_name,
      gender: data.gender,
      timezone: data.timezone,
      avatarPreference: data.avatar_preference,
      activityLevel: data.activity_level,
      dateOfBirth: data.date_of_birth,
    });
  }

  async updateDailyGoals(userId: string, payload: Partial<DailyGoals>) {
    const current = this.dailyGoalsSignal();
    const calories = payload.caloriesTarget ?? current?.caloriesTarget ?? 2000;
    const water = payload.waterMlTarget ?? current?.waterMlTarget ?? 2000;
    const steps = payload.stepsTarget ?? current?.stepsTarget ?? 6000;

    const { data, error } = await this.supabase
      .from('daily_goals')
      .upsert({
        user_id: userId,
        calories_target: calories,
        protein_target: payload.proteinTarget ?? current?.proteinTarget ?? null,
        carbs_target: payload.carbsTarget ?? current?.carbsTarget ?? null,
        fat_target: payload.fatTarget ?? current?.fatTarget ?? null,
        water_ml_target: water,
        steps_target: steps,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update daily goals', error.message);
      return;
    }

    if (data) {
      this.dailyGoalsSignal.set({
        caloriesTarget: data.calories_target,
        proteinTarget: data.protein_target,
        carbsTarget: data.carbs_target,
        fatTarget: data.fat_target,
        waterMlTarget: data.water_ml_target,
        stepsTarget: data.steps_target ?? undefined,
      });
    }
  }

  async logMeasurement(userId: string, payload: BodyMeasurementInput) {
    const { data, error } = await this.supabase
      .from('body_measurements')
      .insert({
        user_id: userId,
        height_cm: payload.heightCm,
        weight_kg: payload.weightKg,
        body_fat_pct: payload.bodyFatPct ?? null,
        waist_cm: payload.waistCm ?? null,
        recorded_at: payload.recordedAt ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log measurement', error.message);
      return;
    }

    const heightM = data.height_cm / 100;
    const bmi = heightM > 0 ? data.weight_kg / (heightM * heightM) : 0;

    this.latestMeasurementSignal.set({
      id: data.id,
      recordedAt: data.recorded_at,
      heightCm: data.height_cm,
      weightKg: data.weight_kg,
      bmi,
      bodyFatPct: data.body_fat_pct,
    });
  }

  async loadLatestMeasurement(userId: string) {
    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load body measurement', error.message);
      return;
    }

    if (data) {
      const heightM = data.height_cm / 100;
      const bmi = heightM > 0 ? data.weight_kg / (heightM * heightM) : 0;

      this.latestMeasurementSignal.set({
        id: data.id,
        recordedAt: data.recorded_at,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        bmi,
        bodyFatPct: data.body_fat_pct,
      });
    }
  }

  async fetchDashboardSummary(date: string) {
    const url = `${this.env.supabase.url}/functions/v1/dashboard-summary?date=${date}`;
    return this.http.get(url);
  }
}
