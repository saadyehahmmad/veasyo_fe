import { CommonModule } from '@angular/common';
import { Component, inject, input, output, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';
import { AppLanguages } from '../../../../public/assets/locale.type';

@Component({
  selector: 'app-change-language',
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './change-language.component.html',
  styleUrl: './change-language.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChangeLanguageComponent {
  _languageService = inject(LanguageService);
  _translate = inject(TranslateService);

  color = input<string>('light');

  langChange = output<string>();

  get currentLanguage(): string {
    return this._languageService.currentLocale;
  }

  switchLanguage(lang: AppLanguages) {
    this._languageService.switchSystemLanguage(lang);
    this.langChange.emit(lang);
  }
  notCurrentLanguage(): string {
    if (this.currentLanguage === 'en') {
      return 'ar';
    } else {
      return 'en';
    }
  }
  switchLang(): void {
    if (this.currentLanguage === 'en') {
      this.switchLanguage('ar');
    } else {
      this.switchLanguage('en');
    }
  }
}
