import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { ENVIRONMENT } from '../tokens/environment.token';

export interface FoodLookupResponse {
  barcode: string;
  name: string;
  brand?: string | null;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  servingSize: string;
  lastSyncedAt: string;
  source: 'open_food_facts' | 'manual';
}

export interface FoodUpsertRequest {
  barcode: string;
  name: string;
  brand?: string | null;
  servingSize?: string | null;
  calories?: number | null;
  macros: {
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  };
  micros?: Record<string, unknown>;
  source?: 'open_food_facts' | 'manual';
}

@Injectable({
  providedIn: 'root',
})
export class FoodDataService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly serviceKey = this.env.foodCacheServiceKey;

  lookupBarcode(barcode: string) {
    return this.http
      .get<FoodLookupResponse>(`${this.env.openFoodFactsProxyUrl}/foods/${barcode}`)
      .pipe(map((response) => ({ ...response, barcode })));
  }

  search(query: string) {
    return this.http.get<FoodLookupResponse[]>(`${this.env.openFoodFactsProxyUrl}/search`, {
      params: { q: query },
    });
  }

  refreshBarcode(barcode: string) {
    return this.http.post<FoodLookupResponse>(
      `${this.env.openFoodFactsProxyUrl}/foods/${barcode}/refresh`,
      {},
      {
        headers: this.buildServiceHeaders(),
      }
    );
  }

  bulkUpsert(payload: FoodUpsertRequest[]) {
    return this.http.post<FoodLookupResponse[]>(
      `${this.env.openFoodFactsProxyUrl}/foods/bulk`,
      payload,
      {
        headers: this.buildServiceHeaders(),
      }
    );
  }

  private buildServiceHeaders(): HttpHeaders {
    const headers: Record<string, string> = {};
    if (this.serviceKey) {
      headers['X-Service-Key'] = this.serviceKey;
    }
    return new HttpHeaders(headers);
  }
}
