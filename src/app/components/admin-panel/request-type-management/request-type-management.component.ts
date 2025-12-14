import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../services/api.service';
import { RequestTypeConfig } from '../../../models/types';
import { TranslateModule, TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-request-type-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './request-type-management.component.html',
  styleUrls: ['./request-type-management.component.scss'],
})
export class RequestTypeManagementComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);
  private _translate = inject(TranslateService);

  requestTypes = signal<RequestTypeConfig[]>([]);
  loading = signal(false);
  showDialog = signal(false);
  isEditMode = signal(false);
  formData = signal<Partial<RequestTypeConfig>>({});
  editingId = signal<string | null>(null);

  // Grid layout - no table columns needed

  ngOnInit() {
    this.loadRequestTypes();
  }

  loadRequestTypes() {
    this.loading.set(true);
    this._apiService.getRequestTypes().subscribe({
      next: (types) => {
        this.requestTypes.set(types);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading request types:', error);
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.loadFailed'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  openCreateDialog() {
    this.isEditMode.set(false);
    this.formData.set({ nameEn: '', nameAr: '', icon: 'notifications', active: true });
    this.showDialog.set(true);
  }

  editRequestType(requestType: RequestTypeConfig) {
    this.isEditMode.set(true);
    this.editingId.set(requestType.id);
    this.formData.set({ ...requestType });
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.formData.set({});
    this.editingId.set(null);
  }

  saveRequestType() {
    const data = this.formData();
    
    if (!data.nameEn || !data.nameAr || !data.icon) {
      this._snackBar.open(this._translate.instant('admin.requestTypeManagement.fillAllFields'), 'Close', { duration: 3000 });
      return;
    }

    if (this.isEditMode() && this.editingId()) {
      const id = this.editingId();
      if (!id) return;
      
      this._apiService.updateRequestType(id, data).subscribe({
        next: () => {
          this._snackBar.open(this._translate.instant('admin.requestTypeManagement.updateSuccess'), 'Close', { duration: 3000 });
          this.closeDialog();
          this.loadRequestTypes();
        },
        error: (error) => {
          console.error('Error updating request type:', error);
          this._snackBar.open(this._translate.instant('admin.requestTypeManagement.updateFailed'), 'Close', { duration: 3000 });
        },
      });
    } else {
      this._apiService.createRequestType(data).subscribe({
        next: () => {
          this._snackBar.open(this._translate.instant('admin.requestTypeManagement.createSuccess'), 'Close', { duration: 3000 });
          this.closeDialog();
          this.loadRequestTypes();
        },
        error: (error) => {
          console.error('Error creating request type:', error);
          this._snackBar.open(this._translate.instant('admin.requestTypeManagement.createFailed'), 'Close', { duration: 3000 });
        },
      });
    }
  }

  toggleActive(requestType: RequestTypeConfig) {
    this._apiService.updateRequestType(requestType.id, { active: !requestType.active }).subscribe({
      next: () => {
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.toggleSuccess'), 'Close', { duration: 2000 });
        this.loadRequestTypes();
      },
      error: (error) => {
        console.error('Error toggling request type:', error);
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.toggleFailed'), 'Close', { duration: 3000 });
      },
    });
  }

  deleteRequestType(requestType: RequestTypeConfig) {
    if (!confirm(this._translate.instant('admin.requestTypeManagement.deleteConfirm', { name: requestType.nameEn }))) {
      return;
    }

    this._apiService.deleteRequestType(requestType.id).subscribe({
      next: () => {
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.deleteSuccess'), 'Close', { duration: 3000 });
        this.loadRequestTypes();
      },
      error: (error) => {
        console.error('Error deleting request type:', error);
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.deleteFailed'), 'Close', { duration: 3000 });
      },
    });
  }

  onDrop(event: CdkDragDrop<RequestTypeConfig[]>) {
    const types = [...this.requestTypes()];
    moveItemInArray(types, event.previousIndex, event.currentIndex);
    
    // Check if order actually changed
    const originalOrder = this.requestTypes().map(t => t.id);
    const newOrder = types.map(t => t.id);
    const orderChanged = originalOrder.some((id, index) => id !== newOrder[index]);
    
    if (!orderChanged) {
      return; // No change, don't call API
    }
    
    // Update display order values to reflect new positions
    const updatedTypes = types.map((type, index) => ({
      ...type,
      displayOrder: index + 1
    }));
    
    // Update display order
    const orderedIds = types.map(t => t.id);
    
    this._apiService.reorderRequestTypes(orderedIds).subscribe({
      next: () => {
        this.requestTypes.set(updatedTypes);
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.reorderSuccess'), 'Close', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error reordering request types:', error);
        this._snackBar.open(this._translate.instant('admin.requestTypeManagement.reorderFailed'), 'Close', { duration: 3000 });
        this.loadRequestTypes(); // Reload to reset order
      },
    });
  }
}
