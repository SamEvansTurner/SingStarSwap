import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface DialogData {
  currentPort: string;
  newPort: string;
}

@Component({
  selector: 'app-server-settings-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm Server Restart</h2>
    <mat-dialog-content>
      <p>Changing the port requires a server restart.</p>
      <p><strong>Current port:</strong> {{ data.currentPort }}</p>
      <p><strong>New port:</strong> {{ data.newPort }}</p>
      <p>The page will automatically redirect to the new port after the server restarts.</p>
      <p>Do you want to continue?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onConfirm()">Confirm</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px 0;
    }
    mat-dialog-content p {
      margin: 8px 0;
    }
  `]
})
export class ServerSettingsConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ServerSettingsConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
