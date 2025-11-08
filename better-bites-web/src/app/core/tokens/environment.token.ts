import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export type EnvironmentConfig = typeof environment;

export const ENVIRONMENT = new InjectionToken<EnvironmentConfig>('app.environment');
