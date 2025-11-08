import { Injectable, computed, inject, signal } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';

export interface MotivationalMessage {
  id: string;
  message: string;
  category: string;
  displayWeight: number;
}

export interface FitnessTip {
  id: string;
  title: string;
  content: string;
  type: 'diet' | 'exercise' | 'mindset';
  tags: string[];
}

@Injectable({
  providedIn: 'root',
})
export class MotivationService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;

  private readonly messagesSignal = signal<MotivationalMessage[]>([]);
  private readonly tipsSignal = signal<FitnessTip[]>([]);

  readonly messages = computed(() => this.messagesSignal());
  readonly tips = computed(() => this.tipsSignal());

  async loadActiveContent() {
    const [{ data: messages }, { data: tips }] = await Promise.all([
      this.supabase.from('motivational_messages').select('*').eq('is_active', true),
      this.supabase.from('fitness_tips').select('*').eq('is_active', true),
    ]);

    this.messagesSignal.set(
      (messages ?? []).map((entry) => ({
        id: entry.id,
        message: entry.message,
        category: entry.category,
        displayWeight: entry.display_weight ?? 1,
      }))
    );

    this.tipsSignal.set(
      (tips ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        type: entry.type,
        tags: entry.tags ?? [],
      }))
    );
  }
}
