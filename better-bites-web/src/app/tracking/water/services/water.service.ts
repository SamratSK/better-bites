import { Injectable, inject, signal } from '@angular/core';

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
  private readonly cache = new Map<string, WaterEntry[]>();
  private readonly changeSignal = signal(0);

  readonly version = () => this.changeSignal();

  private cacheKey(userId: string, date: string) {
    return `${userId}:${date}`;
  }

  async listByDate(userId: string, date: string, options: { force?: boolean } = {}): Promise<WaterEntry[]> {
    const key = this.cacheKey(userId, date);
    if (!options.force && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const { startIso, endIso } = this.createDayBounds(date);
    const { data, error } = await this.supabase
      .from('water_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', startIso)
      .lt('logged_at', endIso)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch water entries', error.message);
      return this.cache.get(key) ?? [];
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      volumeMl: Number(row.volume_ml ?? 0),
      loggedAt: row.logged_at,
    }));

    this.cache.set(key, mapped);
    return mapped;
  }

  async log(userId: string, logDate: string, volumeMl: number): Promise<WaterEntry | null> {
    const loggedAt = this.buildLoggedAtTimestamp(logDate);
    const { data, error } = await this.supabase
      .from('water_entries')
      .insert({
        user_id: userId,
        logged_at: loggedAt,
        volume_ml: volumeMl,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log water entry', error.message);
      return null;
    }

    const entry: WaterEntry = {
      id: data.id,
      userId: data.user_id,
      volumeMl: Number(data.volume_ml ?? 0),
      loggedAt: data.logged_at,
    };

    const key = this.cacheKey(userId, logDate);
    const existing = this.cache.get(key) ?? [];
    this.cache.set(key, [entry, ...existing]);
    this.changeSignal.update((value) => value + 1);

    return entry;
  }

  // Water entries only persist timestamps, so we derive daily windows/timestamps in UTC.
  private createDayBounds(date: string) {
    const start = this.safeParseDate(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  private buildLoggedAtTimestamp(date: string): string {
    const day = this.safeParseDate(date);
    const now = new Date();
    day.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    return day.toISOString();
  }

  private safeParseDate(date: string): Date {
    if (date) {
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  }
}
