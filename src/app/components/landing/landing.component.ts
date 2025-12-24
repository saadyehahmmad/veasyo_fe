import { Component, OnInit, OnDestroy, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ChangeLanguageComponent } from '../../shared/change-language/change-language.component';
import { InteractiveDemoComponent } from './interactive-demo/interactive-demo.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslateModule, ChangeLanguageComponent, MatIconModule, InteractiveDemoComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, OnDestroy {

  protected readonly features = [
    {
      icon: 'bolt',
      titleKey: 'landing.featureRealTime',
      descriptionKey: 'landing.featureRealTimeDesc',
    },
    {
      icon: 'qr_code_scanner',
      titleKey: 'landing.featureQRCode',
      descriptionKey: 'landing.featureQRCodeDesc',
    },
    {
      icon: 'print',
      titleKey: 'landing.featurePrinter',
      descriptionKey: 'landing.featurePrinterDesc',
    },
    {
      icon: 'notifications',
      titleKey: 'landing.featureAudio',
      descriptionKey: 'landing.featureAudioDesc',
    },
    {
      icon: 'analytics',
      titleKey: 'landing.featureAnalytics',
      descriptionKey: 'landing.featureAnalyticsDesc',
    },
    {
      icon: 'palette',
      titleKey: 'landing.featureBranding',
      descriptionKey: 'landing.featureBrandingDesc',
    },
    {
      icon: 'groups',
      titleKey: 'landing.featureMultiTenant',
      descriptionKey: 'landing.featureMultiTenantDesc',
    },
    {
      icon: 'webhook',
      titleKey: 'landing.featureWebhook',
      descriptionKey: 'landing.featureWebhookDesc',
    },
    {
      icon: 'star',
      titleKey: 'landing.featureFeedback',
      descriptionKey: 'landing.featureFeedbackDesc',
    },
  ];

  protected isScrolled = signal(false);
  
  private _router = inject(Router);
  private _translate = inject(TranslateService);
  
  // Translation keys for illustrations
  // Translation properties for illustrations - using getters that react to language changes
  get customerViewMenu() { return this._translate.instant('customer.viewMenu'); }
  get customerCallWaiter() { return this._translate.instant('customer.callWaiter'); }
  get customerRequestBill() { return this._translate.instant('customer.requestBill'); }
  get customerWater() { 
    // Check if water translation exists, otherwise use assistance as fallback
    const water = this._translate.instant('customer.water');
    return water && water !== 'customer.water' ? water : 'Water';
  }
  get customerCustomRequest() { return this._translate.instant('customer.customRequest'); }
  get customerViewLabel() { return this._translate.instant('landing.customerView') || 'Customer View'; }
  
  get waiterDashboard() { return this._translate.instant('waiter.dashboard'); }
  get waiterPending() { return this._translate.instant('waiter.pending'); }
  get waiterInProgress() { return this._translate.instant('waiter.inProgress'); }
  get waiterTable() { return this._translate.instant('waiter.table'); }
  get waiterCallWaiter() { return this._translate.instant('waiter.callWaiter'); }
  get waiterRequestBill() { return this._translate.instant('waiter.requestBill'); }
  get waiterAcknowledge() { return this._translate.instant('waiter.acknowledge'); }
  get waiterStatusPending() { return this._translate.instant('waiter.statusPending'); }
  get waiterDashboardLabel() { return this._translate.instant('landing.waiterDashboard') || 'Waiter Dashboard'; }
  
  // Admin translations
  get adminServiceRequests() { return this._translate.instant('admin.serviceRequests.title'); }
  get adminTable() { return this._translate.instant('admin.serviceRequests.tableName'); }
  get adminStatus() { return this._translate.instant('admin.serviceRequests.status'); }
  get adminType() { return this._translate.instant('admin.serviceRequests.type'); }
  get adminDuration() { return this._translate.instant('admin.serviceRequests.duration'); }
  get adminAdminPanel() { return this._translate.instant('admin.adminPanel') || 'Admin Panel'; }
  get adminPanelLabel() { return this._translate.instant('landing.adminPanel') || 'Admin Management'; }

  ngOnInit(): void {
    this.updateScrollPosition();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.updateScrollPosition();
  }

  private updateScrollPosition(): void {
    const scrollY = window.scrollY;
    this.isScrolled.set(scrollY > 50);
  }

  navigateToLogin(): void {
    this._router.navigate(['/login']);
  }

  openEmailClient(): void {
    const email = environment.contactusEmail;
    const subject = this._translate.instant('landing.getStarted') + ' - ' + this._translate.instant('landing.platformName');
    const body =
      'Hi,\n\nI would like to get started with ' + this._translate.instant('landing.platformName') + ' - ' + this._translate.instant('landing.tagline') + '.\n\nPlease provide me with more information.\n\nBest regards,';

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
