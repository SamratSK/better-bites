import { computed, inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ENVIRONMENT } from '../tokens/environment.token';

@Injectable({
  providedIn: 'root',
})
export class SupabaseClientService {
  private readonly env = inject(ENVIRONMENT);
  private readonly client = createClient(this.env.supabase.url, this.env.supabase.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });

  readonly projectUrl = computed(() => this.env.supabase.url);

  get clientInstance(): SupabaseClient {
    return this.client;
  }
}
