import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';

export interface AdminCounts {
  memberCount: number;
  motivationCount: number;
  cachedFoodCount: number;
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

  async loadCounts(): Promise<AdminCounts> {
    const [members, messages, foods] = await Promise.all([
      this.countRows('profiles'),
      this.countRows('motivational_messages'),
      this.countRows('food_references'),
    ]);

    return {
      memberCount: members,
      motivationCount: messages,
      cachedFoodCount: foods,
    };
  }

  async fetchFlaggedItems(limit = 5): Promise<FlaggedItemSummary[]> {
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

    return rows.map((row) => ({
      id: row.id,
      type: row.item_type,
      reason: row.reason ?? 'Needs review',
      status: row.status,
      submittedBy: profileLookup.get(row.user_id) ?? 'Member',
      submittedAt: row.created_at,
      handledBy: row.handled_by ? profileLookup.get(row.handled_by) ?? 'Admin' : null,
    }));
  }

  private async countRows(table: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Failed to count rows for ${table}`, error.message);
      return 0;
    }

    return count ?? 0;
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
}
