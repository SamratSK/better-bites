import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from '../../../core/services/supabase-client.service';

export interface ActivityEntry {
  id: string;
  userId: string;
  logDate: string;
  loggedAt: string;
  activityType: string;
  durationMin: number;
  intensity: string | null;
  caloriesBurned: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateActivityPayload {
  userId: string;
  logDate: string;
  loggedAt?: string;
  activityType: string;
  durationMin: number;
  intensity: string;
  caloriesBurned?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;

  async listByDate(userId: string, logDate: string): Promise<ActivityEntry[]> {
    const { data, error } = await this.supabase
      .from('activity_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', logDate)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch activity entries', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      logDate: row.log_date,
       loggedAt: row.logged_at,
      activityType: row.activity_type,
      durationMin: Number(row.duration_min ?? 0),
      intensity: row.intensity,
      caloriesBurned: Number(row.calories_burned ?? 0),
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  async create(payload: CreateActivityPayload): Promise<ActivityEntry | null> {
    const { data, error } = await this.supabase
      .from('activity_entries')
      .insert({
        user_id: payload.userId,
        log_date: payload.logDate,
        logged_at: payload.loggedAt ?? new Date().toISOString(),
        activity_type: payload.activityType,
        duration_min: payload.durationMin,
        intensity: payload.intensity,
        calories_burned: payload.caloriesBurned ?? 0,
        notes: payload.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create activity entry', error.message);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      logDate: data.log_date,
      loggedAt: data.logged_at,
      activityType: data.activity_type,
      durationMin: Number(data.duration_min ?? 0),
      intensity: data.intensity,
      caloriesBurned: Number(data.calories_burned ?? 0),
      notes: data.notes,
      createdAt: data.created_at,
    };
  }
}
