import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from '../../../core/services/supabase-client.service';

export interface WaterEntry {
  id: string;
  userId: string;
  volumeMl: number;
  loggedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class WaterService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;

  async listByDate(userId: string, date: string): Promise<WaterEntry[]> {
    const { data, error } = await this.supabase
      .from('water_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${date} 00:00:00`)
      .lte('logged_at', `${date} 23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch water entries', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      volumeMl: Number(row.volume_ml ?? 0),
      loggedAt: row.logged_at,
    }));
  }

  async log(userId: string, volumeMl: number): Promise<WaterEntry | null> {
    const { data, error } = await this.supabase
      .from('water_entries')
      .insert({
        user_id: userId,
        volume_ml: volumeMl,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log water entry', error.message);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      volumeMl: Number(data.volume_ml ?? 0),
      loggedAt: data.logged_at,
    };
  }
}
