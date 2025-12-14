import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TenantThemeService } from '../../../services/tenant-theme.service';
import { ChangeLanguageComponent } from '../../../shared/change-language/change-language.component';

@Component({
  selector: 'app-customer-header',
  standalone: true,
  imports: [CommonModule, TranslateModule, ChangeLanguageComponent],
  templateUrl: './customer-header.component.html',
  styleUrls: ['./customer-header.component.scss'],
})
export class CustomerHeaderComponent {
  private _themeService = inject(TenantThemeService);

  // Direct access to the branding signal from theme service
  branding = this._themeService.getBranding();
}
