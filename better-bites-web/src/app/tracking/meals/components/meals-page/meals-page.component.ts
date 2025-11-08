import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { FoodDataService } from '../../../../core/services/food-data.service';
import { MealEntry, MealService } from '../../services/meal.service';

@Component({
  selector: 'app-meals-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './meals-page.component.html',
  styleUrls: ['./meals-page.component.css'],
})
export class MealsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly foodDataService = inject(FoodDataService);
  private readonly mealService = inject(MealService);
  private readonly authService = inject(AuthService);

  readonly scanForm = this.fb.nonNullable.group({
    barcode: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly lookupResult = signal<any | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly meals = signal<MealEntry[]>([]);
  readonly mealsLoading = signal(false);
  readonly logDate = signal(new Date().toISOString().slice(0, 10));

  readonly totalCalories = computed(() =>
    this.meals().reduce((acc, meal) => acc + (meal.calories ?? 0), 0)
  );

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refreshMeals();
      }
    });
  }

  async fetchBarcode() {
    this.errorMessage.set(null);
    if (this.scanForm.invalid) {
      this.scanForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.foodDataService.lookupBarcode(this.scanForm.value.barcode!)
      );
      this.lookupResult.set(result ?? null);
    } catch (error: any) {
      this.errorMessage.set(error?.message ?? 'Unable to fetch food details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshMeals() {
    const user = this.authService.user();
    if (!user) {
      return;
    }

    this.mealsLoading.set(true);
    const entries = await this.mealService.listByDate(user.id, this.logDate());
    this.meals.set(entries);
    this.mealsLoading.set(false);
  }

  async logLookupResult(mealType: string = 'snack') {
    const user = this.authService.user();
    const lookup = this.lookupResult();
    if (!user || !lookup) {
      return;
    }

    await this.mealService.create({
      userId: user.id,
      logDate: this.logDate(),
      mealType,
      description: lookup.name,
      calories: lookup.calories ?? 0,
      protein: lookup.macros?.protein ?? 0,
      carbs: lookup.macros?.carbs ?? 0,
      fat: lookup.macros?.fat ?? 0,
      source: 'open_food_facts',
    });

    await this.refreshMeals();
  }
}
