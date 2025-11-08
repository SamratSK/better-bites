import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';

import { SupabaseClientService } from './supabase-client.service';

export type AuthRole = 'member' | 'admin';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly loadingSignal = signal<boolean>(true);

  readonly session = computed(() => this.sessionSignal());
  readonly user: Signal<User | null> = computed(() => this.sessionSignal()?.user ?? null);
  readonly role: Signal<AuthRole> = computed(() => {
    const metadataRole = this.user()?.app_metadata?.['role'];
    return (metadataRole ?? 'member') as AuthRole;
  });
  readonly isAuthenticated = computed(() => Boolean(this.sessionSignal()));
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isLoading = computed(() => this.loadingSignal());

  constructor() {
    this.restoreSession();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session ?? null);
      this.loadingSignal.set(false);
    });
  }

  private async restoreSession(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();
    if (!error) {
      this.sessionSignal.set(data.session ?? null);
    }
    this.loadingSignal.set(false);
  }

  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signInWithOtp(email: string) {
    return this.supabase.auth.signInWithOtp({ email });
  }

  async signUpWithPassword(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    await this.supabase.auth.signOut();
    this.sessionSignal.set(null);
  }

  getSessionSnapshot(): Session | null {
    return this.sessionSignal();
  }
}
