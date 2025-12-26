import { Component, OnInit, signal, ChangeDetectionStrategy, Type, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TenantBrandingComponent } from './tenant-branding/tenant-branding.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { TableManagementComponent } from './table-management/table-management.component';
import { ServiceRequestsComponent } from './service-requests/service-requests.component';
import { RequestTypeManagementComponent } from './request-type-management/request-type-management.component';
import { QrGeneratorComponent } from './qr-generator/qr-generator.component';
import { IntegrationsComponent } from './integrations/integrations.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { ChangeLanguageComponent } from '../../shared/change-language/change-language.component';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

interface AdminTab {
  label: string;
  icon: string;
  component: Type<any>;
  roles?: string[]; // Optional: restrict tab to certain roles
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    TenantBrandingComponent,
    UserManagementComponent,
    TableManagementComponent,
    ServiceRequestsComponent,
    RequestTypeManagementComponent,
    QrGeneratorComponent,
    IntegrationsComponent,
    SubscriptionComponent,
    ChangeLanguageComponent,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit {
  private _authService = inject(AuthService);
  private _translate = inject(TranslateService);
  private _languageService = inject(LanguageService);
  // Dynamic tabs configuration
  tabs = signal<AdminTab[]>([
    {
      label: 'admin.menu.userManagement',
      icon: 'group',
      component: UserManagementComponent,
      roles: ['admin', 'superadmin'],
    },
    {
      label: 'admin.menu.tableManagement',
      icon: 'table_restaurant',
      component: TableManagementComponent,
      roles: ['admin', 'manager', 'superadmin'],
    },
    {
      label: 'admin.menu.serviceRequests',
      icon: 'notifications_active',
      component: ServiceRequestsComponent,
      roles: ['admin', 'manager', 'superadmin'],
    },
    {
      label: 'admin.menu.requestTypeManagement',
      icon: 'category',
      component: RequestTypeManagementComponent,
      roles: ['admin', 'superadmin'],
    },
    {
      label: 'admin.menu.qrGenerator',
      icon: 'qr_code_2',
      component: QrGeneratorComponent,
      roles: ['admin', 'manager', 'superadmin'],
    },
    {
      label: 'admin.menu.tenantBranding',
      icon: 'palette',
      component: TenantBrandingComponent,
      roles: ['admin', 'superadmin'],
    },
    {
      label: 'admin.menu.integrations',
      icon: 'settings_input_component',
      component: IntegrationsComponent,
      roles: ['admin', 'superadmin'],
    },
    {
      label: 'admin.menu.subscription',
      icon: 'workspace_premium',
      component: SubscriptionComponent,
      roles: ['admin', 'superadmin'],
    }
  ]);

  // Filtered tabs based on user role
  visibleTabs = signal<AdminTab[]>([]);

  // UI state
  sidebarCollapsed = signal<boolean>(false);
  selectedTab = signal<string>('Analytics');

  private _tabSubtitles: Record<string, string> = {
    'admin.menu.userManagement': 'admin.userManagement.subtitle',
    'admin.menu.tableManagement': 'admin.tableManagement.subtitle',
    'admin.menu.serviceRequests': 'admin.serviceRequests.title',
    'admin.menu.requestTypeManagement': 'admin.requestTypes.subtitle',
    'admin.menu.qrGenerator': 'admin.qrGenerator.subtitle',
    'admin.menu.tenantBranding': 'admin.tenantBranding.subtitle',
    'admin.menu.integrations': 'admin.integrations.subtitle',
    'admin.menu.subscription': 'admin.subscription.subtitle',
    'admin.menu.analytics': 'admin.analytics.overview',
  };

  ngOnInit(): void {
    this._filterTabsByRole();
    // Set first visible tab as default
    const firstTab = this.visibleTabs()[0];
    if (firstTab) {
      this.selectedTab.set(firstTab.label);
    }
  }

  private _filterTabsByRole(): void {
    const user = this._authService.currentUser();
    const userRole = user?.role || 'customer';
    const filtered = this.tabs().filter(
      (tab) => !tab.roles || tab.roles.length === 0 || tab.roles.includes(userRole),
    );
    this.visibleTabs.set(filtered);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  selectTab(tabLabel: string): void {
    this.selectedTab.set(tabLabel);
  }

  getTabSubtitle(): string {
    const subtitleKey = this._tabSubtitles[this.selectedTab()];
    return subtitleKey || '';
  }

  getTranslatedLabel(key: string): string {
    return this._translate.instant(key);
  }

  // Utility to dynamically update tabs (if needed in the future)
  updateTabs(newTabs: AdminTab[]): void {
    this.tabs.set(newTabs);
    this._filterTabsByRole();
  }

  logout(): void {
    this._authService.logout();
  }

  get currentUser() {
    return this._authService.currentUser();
  }
}
