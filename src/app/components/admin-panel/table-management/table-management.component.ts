import { Component, OnInit, signal, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Table } from '../../../models/types';
import { ApiService } from '../../../services/api.service';
import { LoggerService } from '../../../services/logger.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './table-management.component.html',
  styleUrls: ['./table-management.component.scss'],
})
export class TableManagementComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);
  private _dialog = inject(MatDialog);

  tables = signal<Table[]>([]);
  loading = signal(false);
  editingTable = signal<Table | null>(null);
  createForm: FormGroup;
  editForm: FormGroup;
  tableColumns = ['id', 'tableNumber', 'name', 'zone', 'capacity', 'status', 'actions'];

  constructor(private _fb: FormBuilder) {
    this.createForm = this._fb.group({
      tableNumber: ['', Validators.required],
      name: [''],
      zone: [''],
      capacity: [null, [Validators.min(1)]],
      status: ['active', Validators.required],
    });
    this.editForm = this._fb.group({
      tableNumber: ['', Validators.required],
      name: [''],
      zone: [''],
      capacity: [null, [Validators.min(1)]],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this._loadTables();
  }

  private _loadTables(): void {
    this.loading.set(true);
    this._apiService.getTables().subscribe({
      next: (tables) => {
        this.tables.set(tables);
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error loading tables:', error);
        this._snackBar.open(this._translate.instant('admin.tableManagement.loadTablesError'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  createTable(): void {
    if (this.createForm.invalid) {
      this._snackBar.open(this._translate.instant('admin.tableManagement.fillRequiredFields'), 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const tableData = this.createForm.value;

    this._apiService.createTable(tableData).subscribe({
      next: (table) => {
        this.tables.update((tables) => [...tables, table]);
        this._resetCreateForm();
        this._snackBar.open(this._translate.instant('admin.tableManagement.tableCreated'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error creating table:', error);
        this.loading.set(false);
        
        // Handle table limit exceeded error
        if (error.error?.code === 'TABLE_LIMIT_EXCEEDED') {
          this._showLimitErrorDialog(
            error.error.message || 'You have reached your table limit for your current plan. Please upgrade to add more tables.'
          );
        } else {
          this._snackBar.open(this._translate.instant('admin.tableManagement.createTableError'), 'Close', { duration: 3000 });
        }
      },
    });
  }

  editTable(table: Table): void {
    this.editingTable.set(table);
    this.editForm.patchValue({
      tableNumber: table.tableNumber,
      name: table.name || '',
      zone: table.zone || '',
      capacity: table.capacity || null,
      status: table.status,
    });
  }

  updateTable(): void {
    if (this.editForm.invalid) {
      this._snackBar.open(this._translate.instant('admin.tableManagement.fillRequiredFields'), 'Close', { duration: 3000 });
      return;
    }

    const editingTable = this.editingTable();
    if (!editingTable) return;

    this.loading.set(true);
    const updates = this.editForm.value;

    this._apiService.updateTable(editingTable.id, updates).subscribe({
      next: (updatedTable) => {
        this.tables.update((tables) =>
          tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)),
        );
        this.editingTable.set(null);
        this._resetCreateForm();
        this._snackBar.open(this._translate.instant('admin.tableManagement.tableUpdated'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error updating table:', error);
        this._snackBar.open(this._translate.instant('admin.tableManagement.updateTableError'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  deleteTable(id: string): void {
    if (!confirm(this._translate.instant('admin.tableManagement.confirmDelete'))) {
      return;
    }

    this.loading.set(true);
    this._apiService.deleteTable(id).subscribe({
      next: () => {
        this.tables.update((tables) => tables.filter((t) => t.id !== id));
        this._snackBar.open(this._translate.instant('admin.tableManagement.tableDeleted'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error deleting table:', error);
        this._snackBar.open(this._translate.instant('admin.tableManagement.deleteTableError'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  cancelTableEdit(): void {
    this.editingTable.set(null);
    this.editForm.reset({
      tableNumber: '',
      name: '',
      zone: '',
      capacity: null,
      status: 'active',
    });
  }

  onStatusChange(event: any, type: 'create' | 'edit'): void {
    const status = event.checked ? 'active' : 'inactive';
    if (type === 'create') {
      this.createForm.patchValue({ status });
    } else {
      this.editForm.patchValue({ status });
    }
  }

  private _resetCreateForm(): void {
    this.createForm.reset({
      tableNumber: '',
      name: '',
      zone: '',
      capacity: null,
      status: 'active',
    });
  }

  copyUuid(uuid: string): void {
    navigator.clipboard
      .writeText(uuid)
      .then(() => {
        this._snackBar.open(this._translate.instant('admin.tableManagement.uuidCopied'), 'Close', { duration: 2000 });
      })
      .catch((err) => {
        this._logger.error('Failed to copy UUID:', err);
        this._snackBar.open(this._translate.instant('admin.tableManagement.copyUuidError'), 'Close', { duration: 2000 });
      });
  }

  private _showLimitErrorDialog(message: string): void {
    this._dialog.open(TableLimitErrorDialogComponent, {
      width: '400px',
      data: { message },
    });
  }
}

// Error Dialog Component for Table Limit
@Component({
  selector: 'app-table-limit-error-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">error</mat-icon>
      Subscription Limit Reached
    </h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
})
export class TableLimitErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TableLimitErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}
}
