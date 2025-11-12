import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css'],
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  async submit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, confirmPassword } = this.form.getRawValue();
    const sanitizedEmail = email.trim().toLowerCase();
    if (sanitizedEmail !== email) {
      this.form.patchValue({ email: sanitizedEmail }, { emitEvent: false });
    }

    if (password !== confirmPassword) {
      this.errorMessage.set("Passwords don't match");
      return;
    }

    this.isSubmitting.set(true);
    try {
      const { error } = await this.authService.signUpWithPassword(sanitizedEmail, password);
      if (error) {
        this.errorMessage.set(error.message);
        return;
      }
      this.successMessage.set('Check your inbox to confirm your account.');
      this.form.reset({ email: '', password: '', confirmPassword: '' });
      await this.router.navigate(['/auth/login'], { queryParams: { registered: '1' } });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
