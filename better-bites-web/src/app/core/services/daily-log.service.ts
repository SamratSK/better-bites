import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';

export interface DailySummary {
  id?: string;
  userId: string;
  logDate: string;
  caloriesConsumed: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  waterMl: number;
  steps: number;
}

@Injectable({
  providedIn: 'root',
})
export class DailyLogService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;
  private readonly summaryCache = new Map<string, DailySummary | null>();

  private cacheKey(userId: string, date: string) {
    return `${userId}:${date}`;
  }

  async getSummary(userId: string, date: string, _options: { force?: boolean } = {}): Promise<DailySummary | null> {
    const { data, error } = await this.supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch daily summary', error.message);
      return null;
    }

    return data ? this.mapRecord(data) : null;
  }

  async listRange(userId: string, startDate: string, endDate: string): Promise<DailySummary[]> {
    const { data, error } = await this.supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch daily summaries', error.message);
      return [];
    }

    return (data ?? []).map((record) => this.mapRecord(record));
  }

  private mapRecord(record: any): DailySummary {
    return {
      id: record.id,
      userId: record.user_id,
      logDate: record.log_date,
      caloriesConsumed: Number(record.calories_consumed ?? 0),
      proteinGrams: Number(record.protein_g ?? 0),
      carbsGrams: Number(record.carbs_g ?? 0),
      fatGrams: Number(record.fat_g ?? 0),
      waterMl: Number(record.water_ml ?? 0),
      steps: Number(record.steps ?? 0),
    };
  }
}
