export const environment = {
  production: false,
  supabase: {
    url: 'https://fvpjedrhvthvujgyfpvt.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cGplZHJodnRodnVqZ3lmcHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTQ1MjYsImV4cCI6MjA3NzgzMDUyNn0.MDjLM48LGvJf7aYwaqucYyMypJhtn39mo2QvBS0HWAo',
  },
  openFoodFactsProxyUrl: 'http://localhost:5100',
  foodCacheServiceKey: '',
  featureFlags: {
    barcodeScanner: true,
    hydrationTracking: true,
  },
};
