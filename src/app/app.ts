import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './services/language.service';
import { environment } from '../environments/environment';
import { arabicLocal } from '../../public/assets/ar';
import { englishLocal } from '../../public/assets/en';
import { AppLanguages } from '../../public/assets/locale.type';
import { LoggerService } from './services/logger.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('frontend');
  private _languageService = inject(LanguageService);
  private _logger = inject(LoggerService);
  ngOnInit(): void {
    try {
      this._initLanguageConfig();
      this._logger.info('Language config initialized successfully');
    } catch (error) {
      this._logger.error('Error initializing language config:', error);
    }
  }

  ngOnDestroy(): void {
    try {
      this._destroyLanguageConfig();
      this._logger.info('Language config destroyed successfully');
    } catch (error) {
      this._logger.error('Error destroying language config:', error);
      throw error;
    }
  }

  private _initLanguageConfig(): void {
    this._languageService.initLanguageConfig(environment.supportedLanguages as AppLanguages[], environment.defaultLanguage, { ar: arabicLocal, en: englishLocal });
  }

  private _destroyLanguageConfig(): void {
    this._languageService.reflectDirectionChanges(this._languageService.currentLocale);
  }
}
