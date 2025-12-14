import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

/**
 * Service for displaying snackbar notifications with translations and tenant theme support
 * Provides a centralized way to show snackbars with consistent styling and translations
 */
@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private _snackBar = inject(MatSnackBar);
  private _translate = inject(TranslateService);

  private readonly CLOSE_ACTION_KEY = 'snackbar.close';
  private readonly THEME_CLASS = 'tenant-themed-snackbar';

  /**
   * Default configuration for snackbars
   * Uses tenant theme colors and consistent positioning
   */
  private readonly _defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'center' as MatSnackBarHorizontalPosition,
    verticalPosition: 'top' as MatSnackBarVerticalPosition,
    panelClass: ['tenant-themed-snackbar'],
  };

  /**
   * Show a success snackbar with translation support
   * @param translationKey - Translation key for the message
   * @param params - Optional parameters for translation interpolation
   * @param config - Optional custom configuration
   */
  success(translationKey: string, params?: Record<string, any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    const message = this._translate.instant(translationKey, params);
    const action = this._translate.instant(this.CLOSE_ACTION_KEY);
    
    return this._snackBar.open(message, action, {
      ...this._defaultConfig,
      ...config,
      panelClass: [this.THEME_CLASS, 'success-snackbar', ...(config?.panelClass || [])],
    });
  }

  /**
   * Show an error snackbar with translation support
   * @param translationKey - Translation key for the message
   * @param params - Optional parameters for translation interpolation
   * @param config - Optional custom configuration
   */
  error(translationKey: string, params?: Record<string, any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    const message = this._translate.instant(translationKey, params);
    const action = this._translate.instant(this.CLOSE_ACTION_KEY);
    
    return this._snackBar.open(message, action, {
      ...this._defaultConfig,
      duration: 5000, // Errors stay longer
      ...config,
      panelClass: [this.THEME_CLASS, 'error-snackbar', ...(config?.panelClass || [])],
    });
  }

  /**
   * Show an info snackbar with translation support
   * @param translationKey - Translation key for the message
   * @param params - Optional parameters for translation interpolation
   * @param config - Optional custom configuration
   */
  info(translationKey: string, params?: Record<string, any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    const message = this._translate.instant(translationKey, params);
    const action = this._translate.instant(this.CLOSE_ACTION_KEY);
    
    return this._snackBar.open(message, action, {
      ...this._defaultConfig,
      ...config,
      panelClass: [this.THEME_CLASS, 'info-snackbar', ...(config?.panelClass || [])],
    });
  }

  /**
   * Show a warning snackbar with translation support
   * @param translationKey - Translation key for the message
   * @param params - Optional parameters for translation interpolation
   * @param config - Optional custom configuration
   */
  warning(translationKey: string, params?: Record<string, any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    const message = this._translate.instant(translationKey, params);
    const action = this._translate.instant(this.CLOSE_ACTION_KEY);
    
    return this._snackBar.open(message, action, {
      ...this._defaultConfig,
      ...config,
      panelClass: [this.THEME_CLASS, 'warning-snackbar', ...(config?.panelClass || [])],
    });
  }

  /**
   * Show a custom snackbar with translation support
   * @param translationKey - Translation key for the message
   * @param actionKey - Translation key for the action button (defaults to 'snackbar.close')
   * @param params - Optional parameters for translation interpolation
   * @param config - Optional custom configuration
   */
  show(translationKey: string, actionKey: string = this.CLOSE_ACTION_KEY, params?: Record<string, any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    const message = this._translate.instant(translationKey, params);
    const action = this._translate.instant(actionKey);
    
    return this._snackBar.open(message, action, {
      ...this._defaultConfig,
      ...config,
      panelClass: [this.THEME_CLASS, ...(config?.panelClass || [])],
    });
  }
}

