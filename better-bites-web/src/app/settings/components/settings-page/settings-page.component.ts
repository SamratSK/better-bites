import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css'],
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);

  readonly notificationsForm = this.fb.nonNullable.group({
    emailReminders: [true],
    pushReminders: [true],
    quietHoursStart: ['21:00'],
    quietHoursEnd: ['07:00'],
  });
}
