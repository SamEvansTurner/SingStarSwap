import { Component, inject } from "@angular/core";
import {
    MAT_DIALOG_DATA,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
  } from '@angular/material/dialog';

interface SongSearchDialogData {
    content: string[];
}

@Component({
    selector: 'songsearch-dialog',
    templateUrl: 'songsearch.dialog.html',
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent]
  })
  export class SongSearchDialog {

    readonly data = inject<SongSearchDialogData>(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<SongSearchDialog>);

    constructor() {
        console.log(this.data);
    }
  
    onNoClick(): void {
      this.dialogRef.close();
    }
  }