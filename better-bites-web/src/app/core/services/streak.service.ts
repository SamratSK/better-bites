import { Injectable, computed, inject, signal } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';

export interface Streak {
  id: string;
  streakType: 'overall' | 'water' | 'workout';
  currentStreak: number;
  bestStreak: number;
  lastMetDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class StreakService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;
  private readonly streaksSignal = signal<Streak[]>([]);

  readonly streaks = computed(() => this.streaksSignal());

  async refresh(userId: string) {
    const { data, error } = await this.supabase.from('streaks').select('*').eq('user_id', userId);
    if (error) {
      console.error('Failed to fetch streaks', error.message);
      return;
    }
    this.streaksSignal.set(
      (data ?? []).map((record) => ({
        id: record.id,
        streakType: record.streak_type,
        currentStreak: record.current_streak,
        bestStreak: record.best_streak,
        lastMetDate: record.last_met_date,
      }))
    );
  }
}
