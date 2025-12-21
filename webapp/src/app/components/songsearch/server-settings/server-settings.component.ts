import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../../services/config.service';
import { Config } from '../../../data/config-data.model';
import { ServerSettingsConfirmDialogComponent } from './server-settings-confirm-dialog.component';

@Component({
  selector: 'app-server-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './server-settings.component.html',
  styleUrls: ['./server-settings.component.css']
})
export class ServerSettingsComponent implements OnInit {
  config: Config | null = null;
  originalConfig: Config | null = null;
  isLoading = false;
  errorMessage: string = '';
  configLoadedFromServer = false;

  constructor(
    private configService: ConfigService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.configService.config$.subscribe(config => {
      this.config = JSON.parse(JSON.stringify(config)); // Deep copy
      this.originalConfig = JSON.parse(JSON.stringify(config));
    });

    this.configService.configLoadedFromServer$.subscribe(loaded => {
      this.configLoadedFromServer = loaded;
    });
  }

  get isDirty(): boolean {
    return JSON.stringify(this.config) !== JSON.stringify(this.originalConfig);
  }

  get portChanged(): boolean {
    return this.config?.server.port !== this.originalConfig?.server.port;
  }

  onSave(): void {
    if (!this.config) return;

    if (this.portChanged) {
      this.showConfirmDialog();
    } else {
      this.saveConfig();
    }
  }

  onCancel(): void {
    if (this.originalConfig) {
      this.config = JSON.parse(JSON.stringify(this.originalConfig));
    }
  }

  private showConfirmDialog(): void {
    const dialogRef = this.dialog.open(ServerSettingsConfirmDialogComponent, {
      width: '400px',
      data: {
        currentPort: this.originalConfig?.server.port,
        newPort: this.config?.server.port
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.saveConfig();
      }
    });
  }

  private saveConfig(): void {
    if (!this.config) return;

    this.isLoading = true;

    this.configService.saveConfig(this.config).subscribe({
      next: () => {
        // Success - ConfigService handles redirect/refresh
        this.isLoading = false;
        this.errorMessage = ''; // Clear error on success
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error || 'Failed to save configuration. Please try again.';
        this.cdr.detectChanges(); // Force immediate view update
        console.error('Error saving config:', err);
      }
    });
  }
}
