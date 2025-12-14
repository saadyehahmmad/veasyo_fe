import { Direction } from '@angular/cdk/bidi';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { AppLanguages } from '../../../public/assets/locale.type';

interface DataValue { [key: string]: DataValue | string; }
interface AppLocals {
  [local: string]: {
    lang: AppLanguages;
    data: DataValue;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private _translate = inject(TranslateService);

  get isDevelopment(): boolean {
    return environment.production === false;
  }

  get isProduction(): boolean {
    return environment.production === true;
  }

  get systemLanguages(): readonly string[] {
    return this._translate.getLangs();
  }

  get currentLocale(): string {
    return this._translate.getCurrentLang();
  }

  get direction(): Direction {
    return this._translate.getCurrentLang() === 'ar' as AppLanguages ? 'rtl' : 'ltr';
  }

  initLanguageConfig(languages: string[], defaultLanguage: string, locals: AppLocals): void {
    this._translate.addLangs(languages);
    this.setTranslations(locals);

    let systemLanguage = this.getSystemLanguage();

    if (!systemLanguage) {
      systemLanguage = defaultLanguage || 'en';
      this.setSystemLanguage(systemLanguage);
    }

    this._translate.setFallbackLang(environment.defaultLanguage);
    this._translate.use(systemLanguage);

    this.reflectDirectionChanges(systemLanguage);
  }

  setTranslations(locals: AppLocals) {
    for (const langLocal in locals) {
      if (Object.prototype.hasOwnProperty.call(locals, langLocal)) {
        const element = locals[langLocal];
        this._translate.setTranslation(element.lang, element.data, true);
      }
    }
  }

  setSystemLanguage(lang: string) {
    localStorage.setItem('lang', lang);
  }

  getSystemLanguage(): string | null {
    return localStorage.getItem('lang') || null;
  }

  switchSystemLanguage(lang: string) {
    this.setSystemLanguage(lang);
    this._translate.use(lang);
    this.reflectDirectionChanges(lang);
  }

  reflectDirectionChanges(lang: string) {
    const html = document.querySelector('html');

    if (!html) return;

    if ((lang as AppLanguages) === 'ar') {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ar');
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
    }
  }
}
