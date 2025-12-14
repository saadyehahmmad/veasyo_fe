import { Routes } from '@angular/router';
import { CustomerComponent } from './components/customer/customer.component';
import { WaiterDashboardComponent } from './components/waiter-dashboard/waiter-dashboard.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { SuperAdminPanelComponent } from './components/superadmin-panel/superadmin-panel.component';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { LandingComponent } from './components/landing/landing.component';
import { adminGuard, waiterGuard, superAdminGuard } from './guards/auth-guard';
import { tenantValidationGuard } from './guards/tenant-validation.guard';

export const routes: Routes = [
  {
    path: 'superadmin',
    component: SuperAdminPanelComponent,
    canActivate: [superAdminGuard],
    data: { roles: ['superadmin'] },
  },
  { path: 'landing', component: LandingComponent },
  { path: 'not-found', component: NotFoundComponent },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [tenantValidationGuard],
  },
  {
    path: 'table/:id',
    component: CustomerComponent,
    canActivate: [tenantValidationGuard],
  },
  {
    path: 'waiter',
    component: WaiterDashboardComponent,
    canActivate: [tenantValidationGuard, waiterGuard],
    data: { roles: ['waiter', 'admin', 'superadmin'] },
  },
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [tenantValidationGuard, adminGuard],
    data: { roles: ['admin'] }, // Only regular admins, not superadmins
  },
  
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: '**', redirectTo: '/landing' },
];
