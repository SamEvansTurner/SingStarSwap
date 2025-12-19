import { Component, inject } from "@angular/core";
import {
    MAT_DIALOG_DATA,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
  } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { SongLocations, DiscID } from '../../data/songs-data.model';
import { GameData } from '../../data/game-data.model';
import { GamesDataService } from '../../services/games.data.service';
import { PS3RequestService } from '../../services/ps3-requestsservice.service';

interface SongSearchDialogData {
    songData: SongLocations;
    filterAvailableOnly: boolean;
    sortBy: 'title' | 'artist';
}

interface DiscWithAvailability {
    disc: DiscID;
    game: GameData | null;
    isAvailable: boolean;
}

@Component({
    selector: 'songsearch-dialog',
    templateUrl: 'songsearch.dialog.html',
    styleUrls: ['songsearch.dialog.css'],
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatButtonModule,
        CommonModule]
  })
  export class SongSearchDialog {

    readonly data = inject<SongSearchDialogData>(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<SongSearchDialog>);
    
    filteredDiscs: DiscWithAvailability[] = [];
    isLoading = false;

    constructor(
        private gamesDataService: GamesDataService,
        private ps3RequestService: PS3RequestService
    ) {
        this.processDiscs();
    }

    private processDiscs(): void {
        const availableGames = this.gamesDataService.getData();
        const gameMap = new Map<string, GameData>();
        
        // Create a map for O(1) lookup
        availableGames.forEach(game => {
            if (game.gameSerial) {
                gameMap.set(game.gameSerial, game);
            }
        });

        // Process all discs and determine availability
        const allDiscs = this.data.songData.discids.map(disc => {
            const game = gameMap.get(disc.id) || null;
            return {
                disc,
                game,
                isAvailable: game !== null
            };
        });

        // Filter based on the Available Only setting
        if (this.data.filterAvailableOnly) {
            this.filteredDiscs = allDiscs.filter(item => item.isAvailable);
        } else {
            this.filteredDiscs = allDiscs;
        }
    }

    mountGame(discData: DiscWithAvailability): void {
        if (!discData.isAvailable || !discData.game || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.ps3RequestService.loadDisc(discData.game);
        
        // Reset loading state after a delay (mount operations take time)
        setTimeout(() => {
            this.isLoading = false;
        }, 3000);
    }
  
    onNoClick(): void {
      this.dialogRef.close();
    }
  }
