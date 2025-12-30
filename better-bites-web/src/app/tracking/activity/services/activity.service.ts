import { Injectable, inject, signal } from '@angular/core';

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
  private readonly cache = new Map<string, ActivityEntry[]>();
  private readonly changeSignal = signal(0);

  readonly version = () => this.changeSignal();

  private cacheKey(userId: string, logDate: string) {
    return `${userId}:${logDate}`;
  }

  async listByDate(userId: string, logDate: string, options: { force?: boolean } = {}): Promise<ActivityEntry[]> {
    const key = this.cacheKey(userId, logDate);
    if (!options.force && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const { data, error } = await this.supabase
      .from('activity_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', logDate)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch activity entries', error.message);
      return this.cache.get(key) ?? [];
    }

    const mapped = (data ?? []).map((row) => ({
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

    this.cache.set(key, mapped);
    return mapped;
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

    const entry: ActivityEntry = {
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

    const key = this.cacheKey(payload.userId, payload.logDate);
    const existing = this.cache.get(key) ?? [];
    this.cache.set(key, [entry, ...existing]);
    this.changeSignal.update((value) => value + 1);

    return entry;
  }

  async delete(entryId: string, userId: string, logDate: string): Promise<boolean> {
    const { error } = await this.supabase.from('activity_entries').delete().eq('id', entryId);
    if (error) {
      console.error('Failed to delete activity entry', error.message);
      return false;
    }

    const key = this.cacheKey(userId, logDate);
    const existing = this.cache.get(key) ?? [];
    this.cache.set(
      key,
      existing.filter((entry) => entry.id !== entryId)
    );
    this.changeSignal.update((value) => value + 1);
    return true;
  }
}
