import { Injectable } from '@angular/core';
import { PS2DataService } from './ps2.data.service';
import { PS3DataService } from './ps3.data.service';
import { GameData } from '../data/game-data.model';
import { BehaviorSubject, filter, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
  })

export class GamesDataService {
  private dataSubject: BehaviorSubject<Array<GameData>> = new BehaviorSubject<Array<GameData>>([]);
  gameData$ = this.dataSubject.asObservable().pipe(filter((data): data is Array<GameData> => data !== null));
  private data: Array<GameData> = [];

  constructor(private ps2DataService: PS2DataService, private ps3DataService: PS3DataService) {
    this.ps2DataService.getSingStarGameData().subscribe({
      next: (item) => {
        this.addGame(item);  // Correcting the usage of addGame
      }
    });
    
    this.ps3DataService.getSingStarGameData().subscribe({
      next: (item) => {
        this.addGame(item);  // Correcting the usage of addGame
      }
    });
  }

  addGame(item: GameData): void {
    this.data.push(item);
    this.dataSubject.next(this.data);  // Emit the updated data to the subject
  }

  getData(): Array<GameData> {
    return this.dataSubject.value;  // Return the observable data
  }
}

