import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  protected readonly features = [
    {
      icon: '📱',
      title: 'Digital Menu',
      description:
        'Customers can browse your menu and place orders directly from their smartphones',
    },
    {
      icon: '🔔',
      title: 'Real-time Notifications',
      description:
        'Instant alerts for new orders and service requests to keep your team responsive',
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track performance metrics and gain insights to optimize your service',
    },
    {
      icon: '🎨',
      title: 'Custom Branding',
      description: "Personalize your digital presence with your restaurant's colors and logo",
    },
    {
      icon: '👥',
      title: 'Multi-tenant',
      description: 'Each restaurant gets its own isolated space with custom subdomain',
    },
    {
      icon: '⚡',
      title: 'Fast & Reliable',
      description: 'Built with modern technology for speed and reliability',
    },
  ];

  constructor(private _router: Router) {}

  navigateToLogin(): void {
    this._router.navigate(['/login']);
  }

  openEmailClient(): void {
    const email = environment.contactusEmail;
    const subject = 'Get Started with Waiter Platform';
    const body =
      'Hi,\n\nI would like to get started with the Waiter Platform.\n\nPlease provide me with more information.\n\nBest regards,';

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }
}
