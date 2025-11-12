import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  constructor() {
    const registered = this.route.snapshot.queryParamMap.get('registered');
    if (registered) {
      this.infoMessage.set('Account created! Verify your email, then sign in below.');
    }
  }

  async submit() {
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.form.getRawValue();

    try {
      const result = await this.authService.signInWithPassword(email, password);

      if (result.error) {
        this.errorMessage.set(result.error.message);
      } else {
        await this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      // handles unexpected exceptions
      this.errorMessage.set(err.message || 'An unexpected error occurred.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
