import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/services/auth.service';
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
  private readonly mealService = inject(MealService);
  private readonly authService = inject(AuthService);

  readonly meals = signal<MealEntry[]>([]);
  readonly mealsLoading = signal(false);
  readonly logDate = signal(new Date().toISOString().slice(0, 10));
  readonly manualMode = signal(false);
  readonly manualSubmitting = signal(false);
  readonly manualError = signal<string | null>(null);
  readonly manualForm = this.fb.nonNullable.group({
    mealType: ['meal', Validators.required],
    description: ['', [Validators.required, Validators.minLength(2)]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.min(0)]],
    carbs: [0, [Validators.min(0)]],
    fat: [0, [Validators.min(0)]],
  });

  readonly totalCalories = computed(() =>
    this.meals().reduce((acc, meal) => acc + (meal.calories ?? 0), 0)
  );
  readonly macroTotals = computed(() =>
    this.meals().reduce(
      (acc, meal) => {
        acc.protein += meal.protein ?? 0;
        acc.carbs += meal.carbs ?? 0;
        acc.fat += meal.fat ?? 0;
        return acc;
      },
      { protein: 0, carbs: 0, fat: 0 }
    )
  );

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        void this.refreshMeals();
      }
    });
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

  async deleteMeal(meal: MealEntry) {
    const user = this.authService.user();
    if (!user) {
      return;
    }
    const deleted = await this.mealService.delete(meal.id, user.id, meal.logDate);
    if (deleted) {
      await this.refreshMeals();
    }
  }

  toggleManualEntry() {
    this.manualMode.set(!this.manualMode());
    this.manualError.set(null);
    if (!this.manualMode()) {
      this.manualForm.reset({
        mealType: 'meal',
        description: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
  }

  async saveManualEntry() {
    this.manualError.set(null);
    if (this.manualForm.invalid) {
      this.manualForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user) {
      this.manualError.set('You need to be signed in to log meals.');
      return;
    }

    this.manualSubmitting.set(true);
    const { mealType, description, calories, protein, carbs, fat } = this.manualForm.getRawValue();
    try {
      await this.mealService.create({
        userId: user.id,
        logDate: this.logDate(),
        mealType,
        description: description.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        source: 'manual',
      });
      await this.refreshMeals();
      this.manualForm.reset({
        mealType: 'meal',
        description: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
      this.manualMode.set(false);
    } catch (error: any) {
      this.manualError.set(error?.message ?? 'Failed to log meal.');
    } finally {
      this.manualSubmitting.set(false);
    }
  }
}
