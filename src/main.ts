import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { TenantThemeService } from './app/services/tenant-theme.service';
import { LoggerService } from './app/services/logger.service';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Initialize tenant theme after bootstrap
    const themeService = appRef.injector.get(TenantThemeService);
    const logger = appRef.injector.get(LoggerService);
    themeService
      .initializeTheme()
      .catch((err) => logger.warn('Failed to initialize tenant theme:', err));
  })
  .catch((err) => {
    const logger = new LoggerService();
    logger.error('Application bootstrap failed:', err);
  });
