import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { BackendErrorInterceptor } from './interceptors/backend-error.interceptor';

import { routes } from './app.routes';
import { MatSnackBarModule } from '@angular/material/snack-bar';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Enable interceptors from DI (required for class-based interceptors in standalone apps)
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom([
      TranslateModule.forRoot(),
      MatSnackBarModule,
    ]),
    // Class-based interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BackendErrorInterceptor,
      multi: true,
    }
  ],
};
