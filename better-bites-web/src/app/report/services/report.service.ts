import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { DailyLogService } from '../../core/services/daily-log.service';
import { ProfileService } from '../../core/services/profile.service';
import { StreakService } from '../../core/services/streak.service';
import { SupabaseClientService } from '../../core/services/supabase-client.service';

export interface ReportProfile {
  displayName: string;
  gender: string;
  timezone: string;
  activityLevel: string;
  createdAt?: string | null;
}

export interface ReportGoals {
  caloriesTarget: number | null;
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
  waterMlTarget: number | null;
  stepsTarget: number | null;
}

export interface ReportMeasurement {
  recordedAt: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  waistCm?: number | null;
}

export interface ReportStreak {
  streakType: string;
  currentStreak: number;
  bestStreak: number;
  lastMetDate: string | null;
}

export interface ReportLog {
  logDate: string;
  caloriesConsumed: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  steps: number;
}

export interface ReportData {
  profile: ReportProfile | null;
  goals: ReportGoals | null;
  measurement: ReportMeasurement | null;
  streaks: ReportStreak[];
  recentLogs: ReportLog[];
}

export interface ReportShare {
  shareEnabled: boolean;
  shareToken: string;
}

interface PublicReportPayload {
  profile?: {
    display_name?: string | null;
    gender?: string | null;
    timezone?: string | null;
    activity_level?: string | null;
    created_at?: string | null;
  } | null;
  daily_goals?: {
    calories_target?: number | null;
    protein_target?: number | null;
    carbs_target?: number | null;
    fat_target?: number | null;
    water_ml_target?: number | null;
    steps_target?: number | null;
  } | null;
  latest_measurement?: {
    recorded_at?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    body_fat_pct?: number | null;
    waist_cm?: number | null;
  } | null;
  streaks?: Array<{
    streak_type?: string | null;
    current_streak?: number | null;
    best_streak?: number | null;
    last_met_date?: string | null;
  }>;
  recent_logs?: Array<{
    log_date?: string | null;
    calories_consumed?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    water_ml?: number | null;
    steps?: number | null;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly streakService = inject(StreakService);
  private readonly dailyLogService = inject(DailyLogService);
  private readonly supabase = inject(SupabaseClientService).clientInstance;

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  async buildPrivateReport(): Promise<ReportData | null> {
    const user = this.authService.user();
    if (!user) {
      return null;
    }

    await Promise.all([
      this.profileService.loadProfile(user.id),
      this.profileService.loadDailyGoals(user.id),
      this.profileService.loadLatestMeasurement(user.id),
      this.streakService.refresh(user.id),
    ]);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);
    const recentLogs = await this.dailyLogService.listRange(user.id, start, end);

    const profile = this.profileService.profile();
    const goals = this.profileService.dailyGoals();
    const measurement = this.profileService.latestMeasurement();
    const streaks = this.streakService.streaks();

    return {
      profile: profile
        ? {
            displayName: profile.displayName,
            gender: profile.gender,
            timezone: profile.timezone,
            activityLevel: profile.activityLevel,
          }
        : null,
      goals: goals
        ? {
            caloriesTarget: goals.caloriesTarget ?? null,
            proteinTarget: goals.proteinTarget ?? null,
            carbsTarget: goals.carbsTarget ?? null,
            fatTarget: goals.fatTarget ?? null,
            waterMlTarget: goals.waterMlTarget ?? null,
            stepsTarget: goals.stepsTarget ?? null,
          }
        : null,
      measurement: measurement
        ? {
            recordedAt: measurement.recordedAt,
            heightCm: measurement.heightCm,
            weightKg: measurement.weightKg,
            bodyFatPct: measurement.bodyFatPct ?? null,
          }
        : null,
      streaks: (streaks ?? []).map((streak) => ({
        streakType: streak.streakType,
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        lastMetDate: streak.lastMetDate ?? null,
      })),
      recentLogs: recentLogs.map((log) => ({
        logDate: log.logDate,
        caloriesConsumed: log.caloriesConsumed,
        proteinG: log.proteinGrams,
        carbsG: log.carbsGrams,
        fatG: log.fatGrams,
        waterMl: log.waterMl,
        steps: log.steps,
      })),
    };
  }

  async getOrCreateShare(userId: string): Promise<ReportShare | null> {
    const { data, error } = await this.supabase
      .from('report_shares')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select('share_enabled, share_token')
      .single();

    if (error) {
      console.error('Failed to load report share settings', error.message);
      return null;
    }

    return {
      shareEnabled: data.share_enabled,
      shareToken: data.share_token,
    };
  }

  async updateShareEnabled(userId: string, enabled: boolean): Promise<ReportShare | null> {
    const { data, error } = await this.supabase
      .from('report_shares')
      .update({ share_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('share_enabled, share_token')
      .single();

    if (error) {
      console.error('Failed to update report sharing', error.message);
      return null;
    }

    return {
      shareEnabled: data.share_enabled,
      shareToken: data.share_token,
    };
  }

  async fetchPublicReport(token: string): Promise<ReportData | null> {
    const { data, error } = await this.supabase.rpc('get_public_report', { p_token: token });
    if (error) {
      console.error('Failed to load public report', error.message);
      return null;
    }
    if (!data) {
      return null;
    }
    return this.mapReportPayload(data);
  }

  private mapReportPayload(payload: unknown): ReportData {
    const source = (payload ?? {}) as PublicReportPayload;
    const profile = source.profile ?? null;
    const goals = source.daily_goals ?? null;
    const measurement = source.latest_measurement ?? null;
    const streaks = source.streaks ?? [];
    const recentLogs = source.recent_logs ?? [];

    return {
      profile: profile
        ? {
            displayName: profile.display_name ?? 'Athlete',
            gender: profile.gender ?? 'prefer_not_to_say',
            timezone: profile.timezone ?? 'UTC',
            activityLevel: profile.activity_level ?? 'moderate',
            createdAt: profile.created_at ?? null,
          }
        : null,
      goals: goals
        ? {
            caloriesTarget: goals.calories_target ?? null,
            proteinTarget: goals.protein_target ?? null,
            carbsTarget: goals.carbs_target ?? null,
            fatTarget: goals.fat_target ?? null,
            waterMlTarget: goals.water_ml_target ?? null,
            stepsTarget: goals.steps_target ?? null,
          }
        : null,
      measurement: measurement
        ? {
            recordedAt: measurement.recorded_at ?? '',
            heightCm: measurement.height_cm ?? 0,
            weightKg: measurement.weight_kg ?? 0,
            bodyFatPct: measurement.body_fat_pct ?? null,
            waistCm: measurement.waist_cm ?? null,
          }
        : null,
      streaks: streaks.map((streak) => ({
        streakType: streak.streak_type ?? 'overall',
        currentStreak: streak.current_streak ?? 0,
        bestStreak: streak.best_streak ?? 0,
        lastMetDate: streak.last_met_date ?? null,
      })),
      recentLogs: recentLogs.map((log) => ({
        logDate: log.log_date ?? '',
        caloriesConsumed: Number(log.calories_consumed ?? 0),
        proteinG: Number(log.protein_g ?? 0),
        carbsG: Number(log.carbs_g ?? 0),
        fatG: Number(log.fat_g ?? 0),
        waterMl: Number(log.water_ml ?? 0),
        steps: Number(log.steps ?? 0),
      })),
    };
  }
}
