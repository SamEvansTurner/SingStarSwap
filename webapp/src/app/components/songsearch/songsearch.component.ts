import { Component, ViewChild, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { DiscID, SongLocations, SongsDB } from '../../data/songs-data.model';
import { SongsDataService } from '../../services/songs.data.service';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { asyncScheduler, BehaviorSubject, filter, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { SongSearchDialog } from './songsearch.dialog';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { GamesDataService } from '../../services/games.data.service';
import { GameData } from '../../data/game-data.model';

@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [MatExpansionModule, MatButtonToggleModule, FormsModule, MatSidenavModule, MatCardModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './songsearch.component.html',
  styleUrls: ['./songsearch.component.css']
})
export class SongsearchComponent implements OnInit {
  @ViewChild('settingsdrawer') settingsdrawer!: MatDrawer;
  
  data$!: Observable<SongsDB>;
  gameData$!: Observable<Array<GameData>>;
  songList: SongLocations[] = [];
  songData!: Map<string, SongLocations>;
  countryFilter: string[] = [];

  groupedItems: { letter: string, items: SongLocations[] }[] = [];
  letterArray: string[] = [];

  songListSubject : BehaviorSubject<SongLocations[]> = new BehaviorSubject<SongLocations[]>([]);
  songList$ = this.songListSubject.asObservable().pipe(filter((data): data is SongLocations[] => data !== null));

  sortByKeySubject: BehaviorSubject<keyof SongLocations> = new BehaviorSubject<keyof SongLocations>('artist');
  sortByKey$ = this.sortByKeySubject.asObservable().pipe(filter((data): data is keyof SongLocations => data !== null));

  filterByAvailableSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  filterByAvailable$ = this.filterByAvailableSubject.asObservable().pipe(filter((data): data is boolean => data !== null));

  constructor(private dataService: SongsDataService, private cdRef: ChangeDetectorRef, private dialog: MatDialog, private gamesDataService: GamesDataService) {}

  ngOnInit(): void {
    this.data$  = this.dataService.songsData$;
    this.data$.subscribe((data) => {
      this.createSongListFromDiscs(data);
    });

    this.gameData$ = this.gamesDataService.gameData$;
    this.gameData$.subscribe((data) => {
      this.songListSubject.next(this.buildAndFilterSongList.bind(this)());
    });

    this.songList$.subscribe((data) => {
      this.sortData.bind(this)();
    })

    this.sortByKey$.subscribe((data) => {
      this.sortData.bind(this)();
    })

    this.filterByAvailable$.subscribe((data) => {
      this.songListSubject.next(this.buildAndFilterSongList.bind(this)());
    })
  }

  private createSongListFromDiscs(data: SongsDB): void {
    this.songData = new Map<string, SongLocations>();

    Object.values(data).forEach((disc) => {
      if (this.countryFilter.length === 0 || this.countryFilter.includes(disc.country)) {
        disc.songlist.forEach((song) => {
          const songKey = `${song.artist}${song.title}`;
          const discInfo = { id: disc.id, title: `${disc.title}`, fulltitle: `${disc.title} (${disc.country}) [${disc.platform}]` };
          if (this.songData.has(songKey)) {
            this.songData.get(songKey)!.discids.push(discInfo);
          } else {
            this.songData.set(songKey, { artist: song.artist, title: song.title, discids: [discInfo] });
          }
        });
      }
    });
  }

  private buildLetterArray(): void {
    const firstLetters = new Set<string>();
    this.songList.forEach((song) => {
      const value = song[this.sortByKeySubject.value];
      if (typeof value === 'string') {
        const firstChar = value.charAt(0).toUpperCase();
        firstLetters.add(firstChar);
      }
    });
    this.letterArray = Array.from(firstLetters).sort();
  }

  private groupItems(): void {
    this.groupedItems = this.letterArray.map((letter) => ({
      letter,
      items: this.songList.filter((item) => {
        const value = item[this.sortByKeySubject.value];
        return typeof value === 'string' && value.charAt(0).toUpperCase() === letter;
      }),
    }));
  }

  private buildAndFilterSongList(): SongLocations[] {
    if (!this.songData) return [];
    if (!this.filterByAvailableSubject.value) return Array.from(this.songData.values());
 
    let retArray = Array.from(this.songData.values()).filter( (value, index) => {
      return value.discids.some(item => (this.gamesDataService.getData().map(item => item.gameSerial ?? '')).includes(item.id));
    });
    return retArray;
  }

  sortOrderToggle(event: MatButtonToggleChange): void {
    this.sortByKeySubject.next(event.value as keyof SongLocations);
  }

  filterAvailableToggle(event: MatSlideToggleChange): void {
    this.filterByAvailableSubject.next(event.checked as boolean);
  }

  private sortData(): void {
    this.songList = this.songListSubject.value.sort((a, b) => {
      const valueA = String(a[this.sortByKeySubject.value]);
      const valueB = String(b[this.sortByKeySubject.value]);
      return valueA.localeCompare(valueB);
    });
    this.buildLetterArray();
    this.groupItems();
    if (this.settingsdrawer) {
      this.settingsdrawer.close();
    }
    
  }

  scrollTo(letter: string): void {
    const element = document.getElementById(letter);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private discAvailable(disc: DiscID) {
    if (!this.filterByAvailableSubject.value) return true
    return this.gamesDataService.getData().map(item => item.gameSerial ?? '').includes(disc.id)
  }

  getTitles(song: SongLocations): string[] {
    return song.discids.filter(disc => this.discAvailable(disc)).map(disc => disc.fulltitle);  // Return an array of titles
  }

  openDialog(input : SongLocations) {
    let dialogRef = this.dialog.open(SongSearchDialog, {height:"30%", width:"30%", data: {content: this.getTitles(input)}}, )
  }
}
