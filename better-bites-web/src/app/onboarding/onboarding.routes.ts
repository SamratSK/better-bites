import { Routes } from '@angular/router';

import { OnboardingPageComponent } from './components/onboarding-page/onboarding-page.component';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    component: OnboardingPageComponent,
    title: 'Onboarding | Better Bites',
  },
];
