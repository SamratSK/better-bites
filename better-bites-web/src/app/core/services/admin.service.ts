import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';
import { ENVIRONMENT } from '../tokens/environment.token';
import { ReportService, ReportData } from '../../report/services/report.service';

export interface AdminCounts {
  totalUsers: number;
  memberCount: number;
  adminCount: number;
  motivationCount: number;
}

export interface AdminUser {
  userId: string;
  displayName: string;
  role: string;
  timezone: string;
  activityLevel: string;
  createdAt: string;
}

export interface FlaggedItemSummary {
  id: string;
  type: string;
  reason: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  handledBy?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly supabase = inject(SupabaseClientService).clientInstance;
  private readonly env = inject(ENVIRONMENT);
  private readonly reportService = inject(ReportService);
  private usersCache: { counts: AdminCounts; users: AdminUser[] } | null = null;
  private usersCacheAt = 0;
  private flaggedCache: { items: FlaggedItemSummary[]; timestamp: number } | null = null;
  private readonly cacheTtlMs = 30000;

  async fetchAdminUsers(options: { force?: boolean } = {}): Promise<{ counts: AdminCounts; users: AdminUser[] } | null> {
    if (!options.force && this.usersCache && Date.now() - this.usersCacheAt < this.cacheTtlMs) {
      return this.usersCache;
    }
    const response = await this.callAdminFunction('admin-users');
    if (!response) {
      return null;
    }

    const payload = {
      counts: response.counts as AdminCounts,
      users: (response.users ?? []) as AdminUser[],
    };
    this.usersCache = payload;
    this.usersCacheAt = Date.now();
    return payload;
  }

  async fetchFlaggedItems(limit = 5, options: { force?: boolean } = {}): Promise<FlaggedItemSummary[]> {
    if (!options.force && this.flaggedCache && Date.now() - this.flaggedCache.timestamp < this.cacheTtlMs) {
      return this.flaggedCache.items.slice(0, limit);
    }
    const { data, error } = await this.supabase
      .from('flagged_items')
      .select('id, item_type, reason, status, created_at, handled_at, handled_by, user_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch flagged items', error.message);
      return [];
    }

    const rows = data ?? [];
    const relatedIds = Array.from(
      new Set(
        rows
          .flatMap((item) => [item.user_id, item.handled_by])
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    const profileLookup = await this.fetchDisplayNames(relatedIds);

    const items = rows.map((row) => ({
      id: row.id,
      type: row.item_type,
      reason: row.reason ?? 'Needs review',
      status: row.status,
      submittedBy: profileLookup.get(row.user_id) ?? 'Member',
      submittedAt: row.created_at,
      handledBy: row.handled_by ? profileLookup.get(row.handled_by) ?? 'Admin' : null,
    }));
    this.flaggedCache = { items, timestamp: Date.now() };
    return items;
  }

  private async fetchDisplayNames(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) {
      return new Map();
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (error) {
      console.error('Failed to resolve profile names', error.message);
      return new Map();
    }

    return new Map((data ?? []).map((profile) => [profile.user_id, profile.display_name]));
  }

  async deleteUser(userId: string): Promise<boolean> {
    const response = await this.callAdminFunction('admin-delete-user', { userId });
    return Boolean(response?.success);
  }

  async fetchUserReport(userId: string): Promise<ReportData | null> {
    const payload = await this.callAdminFunction('admin-report', { userId });
    if (!payload) {
      return null;
    }
    return this.reportService.mapReportPayload(payload);
  }

  private async callAdminFunction(endpoint: string, payload?: Record<string, unknown>): Promise<any | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      console.error('Missing auth session for admin request', error?.message);
      return null;
    }

    const response = await fetch(`${this.env.supabase.url}/functions/v1/${endpoint}`, {
      method: payload ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: this.env.supabase.anonKey,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(`Admin function ${endpoint} failed`, message);
      return null;
    }

    return response.json();
  }
}
