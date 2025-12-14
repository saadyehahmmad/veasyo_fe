import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TenantThemeService } from '../../../services/tenant-theme.service';
import { ChangeLanguageComponent } from '../../../shared/change-language/change-language.component';

@Component({
  selector: 'app-waiter-header',
  standalone: true,
  imports: [CommonModule, TranslateModule, ChangeLanguageComponent],
  templateUrl: './waiter-header.component.html',
  styleUrls: ['./waiter-header.component.scss'],
})
export class WaiterHeaderComponent {
  private _themeService = inject(TenantThemeService);

  // Direct access to the branding signal from theme service
  branding = this._themeService.getBranding();
}
