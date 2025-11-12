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
  private readonly roleSignal = signal<AuthRole>('member');

  readonly session = computed(() => this.sessionSignal());
  readonly user: Signal<User | null> = computed(() => this.sessionSignal()?.user ?? null);
  readonly role: Signal<AuthRole> = computed(() => this.roleSignal());
  readonly isAuthenticated = computed(() => Boolean(this.sessionSignal()));
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isLoading = computed(() => this.loadingSignal());

  constructor() {
    this.restoreSession();
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session ?? null);
       void this.refreshRole();
      this.loadingSignal.set(false);
    });
  }

  private async restoreSession(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();
    if (!error) {
      this.sessionSignal.set(data.session ?? null);
      await this.refreshRole();
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
    this.roleSignal.set('member');
  }

  getSessionSnapshot(): Session | null {
    return this.sessionSignal();
  }

  async refreshRole(): Promise<void> {
    const userId = this.sessionSignal()?.user?.id;
    if (!userId) {
      this.roleSignal.set('member');
      return;
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to resolve user role', error.message);
      this.roleSignal.set('member');
      return;
    }

    this.roleSignal.set(((data?.role ?? 'member') as AuthRole));
  }
}
