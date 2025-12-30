import { Injectable, inject, signal } from '@angular/core';

import { SupabaseClientService } from '../../../core/services/supabase-client.service';

export interface MealEntry {
  id: string;
  userId: string;
  logDate: string;
  mealType: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  createdAt: string;
}

export interface CreateMealPayload {
  userId: string;
  logDate: string;
  mealType: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string;
  foodRefId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MealService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;
  private readonly cache = new Map<string, MealEntry[]>();
  private readonly changeSignal = signal(0);

  readonly version = () => this.changeSignal();

  private cacheKey(userId: string, logDate: string) {
    return `${userId}:${logDate}`;
  }

  async listByDate(userId: string, logDate: string, options: { force?: boolean } = {}): Promise<MealEntry[]> {
    const key = this.cacheKey(userId, logDate);
    if (!options.force && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const { data, error } = await this.supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', logDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch meal entries', error.message);
      return [];
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      logDate: row.log_date,
      mealType: row.meal_type,
      description: row.description,
      calories: Number(row.calories ?? 0),
      protein: Number(row.protein_g ?? 0),
      carbs: Number(row.carbs_g ?? 0),
      fat: Number(row.fat_g ?? 0),
      source: row.source ?? 'manual',
      createdAt: row.created_at,
    }));

    this.cache.set(key, mapped);
    return mapped;
  }

  async create(payload: CreateMealPayload): Promise<MealEntry | null> {
    const { data, error } = await this.supabase
      .from('meal_entries')
      .insert({
        user_id: payload.userId,
        log_date: payload.logDate,
        meal_type: payload.mealType,
        description: payload.description,
        calories: payload.calories,
        protein_g: payload.protein,
        carbs_g: payload.carbs,
        fat_g: payload.fat,
        source: payload.source ?? 'manual',
        food_ref_id: payload.foodRefId ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create meal entry', error.message);
      return null;
    }

    const entry: MealEntry = {
      id: data.id,
      userId: data.user_id,
      logDate: data.log_date,
      mealType: data.meal_type,
      description: data.description,
      calories: Number(data.calories ?? 0),
      protein: Number(data.protein_g ?? 0),
      carbs: Number(data.carbs_g ?? 0),
      fat: Number(data.fat_g ?? 0),
      source: data.source ?? 'manual',
      createdAt: data.created_at,
    };

    const key = this.cacheKey(payload.userId, payload.logDate);
    const existing = this.cache.get(key) ?? [];
    this.cache.set(key, [entry, ...existing]);
    this.changeSignal.update((value) => value + 1);

    return entry;
  }

  async delete(mealId: string, userId: string, logDate: string): Promise<boolean> {
    const { error } = await this.supabase.from('meal_entries').delete().eq('id', mealId);
    if (error) {
      console.error('Failed to delete meal entry', error.message);
      return false;
    }

    const key = this.cacheKey(userId, logDate);
    const existing = this.cache.get(key) ?? [];
    this.cache.set(
      key,
      existing.filter((meal) => meal.id !== mealId)
    );
    this.changeSignal.update((value) => value + 1);
    return true;
  }
}
