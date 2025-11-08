import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { StreakService } from '../../../core/services/streak.service';

@Component({
  selector: 'app-streaks-page',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './streaks-page.component.html',
  styleUrls: ['./streaks-page.component.css'],
})
export class StreaksPageComponent {
  private readonly streakService = inject(StreakService);

  readonly streaks = this.streakService.streaks;
  readonly longestStreak = computed(() => this.streaks().reduce((acc, streak) => Math.max(acc, streak.bestStreak), 0));
}
