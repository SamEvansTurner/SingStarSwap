import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { 
  BehaviorSubject, 
  combineLatest, 
  Observable, 
  Subject, 
  takeUntil, 
  map, 
  catchError, 
  of, 
  startWith,
  shareReplay
} from 'rxjs';

// Services
import { SongsDataService } from '../../services/songs.data.service';
import { GamesDataService } from '../../services/games.data.service';
import { SongProcessingService } from '../../services/song-processing.service';
import { SongCacheService } from '../../services/song-cache.service';
import { ErrorHandlingService } from '../../services/error-handling.service';

// Models
import { SongsDB, SongLocations } from '../../data/songs-data.model';
import { GameData } from '../../data/game-data.model';
import { SongSearchState, SongSearchViewModel, initialSongSearchState } from '../../data/song-search-state.model';

// Child Components
import { SongFiltersComponent } from './song-filters/song-filters.component';
import { LetterNavigationComponent } from './letter-navigation/letter-navigation.component';
import { SongGroupComponent } from './song-group/song-group.component';

// Dialog
import { SongSearchDialog } from './songsearch.dialog';
import { ServerSettingsComponent } from "./server-settings/server-settings.component";

@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    SongFiltersComponent,
    LetterNavigationComponent,
    SongGroupComponent,
    ServerSettingsComponent
  ],
  templateUrl: './songsearch.component.html',
  styleUrls: ['./songsearch.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongsearchComponent implements OnInit, OnDestroy {
  
  // State management
  private stateSubject = new BehaviorSubject<SongSearchState>(initialSongSearchState);
  private destroy$ = new Subject<void>();

  // Data storage
  private currentSongsData: SongsDB = {};
  private currentGameData: GameData[] = [];

  // Main view model observable
  vm$: Observable<SongSearchViewModel> = this.stateSubject.pipe(
    map(state => this.createViewModel(state)),
    shareReplay(1)
  );

  constructor(
    private songsDataService: SongsDataService,
    private gamesDataService: GamesDataService,
    private songProcessingService: SongProcessingService,
    private cacheService: SongCacheService,
    private errorHandlingService: ErrorHandlingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeDataStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stateSubject.complete();
  }

  // Event handlers
  onSortChange(sortBy: 'artist' | 'title'): void {
    this.updateState({ sortBy });
    this.processData();
  }

  onFilterChange(showAvailableOnly: boolean): void {
    this.updateState({ showAvailableOnly });
    this.processData();
  }

  onSongSelect(song: SongLocations): void {
    const currentState = this.stateSubject.value;
    this.openSongDialog(song, currentState.showAvailableOnly, currentState.sortBy);
  }

  onLetterClick(letter: string): void {
    this.scrollToLetter(letter);
  }

  onSettingsToggle(drawer: MatDrawer): void {
    drawer.toggle();
  }

  // Public method for template
  processData(): void {
    this.processDataInternal();
  }

  // TrackBy functions for performance
  trackByGroup(index: number, group: any): string {
    return group.letter;
  }

  // Private methods
  private initializeDataStream(): void {
    // Combine data sources with error handling
    const songsData$ = this.songsDataService.songsData$.pipe(
      catchError(error => {
        this.handleError('song-load', error);
        return of({} as SongsDB);
      })
    );

    const gameData$ = this.gamesDataService.gameData$.pipe(
      catchError(error => {
        this.handleError('game-data', error);
        return of([] as GameData[]);
      })
    );

    // React to data changes
    combineLatest([songsData$, gameData$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([songsData, gameData]) => {
        this.currentSongsData = songsData;
        this.currentGameData = gameData;
        this.updateState({ isLoading: true, error: null });
        this.processDataInternal(songsData, gameData);
      });
  }

  private processDataInternal(songsData?: SongsDB, gameData?: GameData[]): void {
    try {
      const currentState = this.stateSubject.value;
      
      // Use provided data or current stored data
      const songs = songsData || this.currentSongsData;
      const games = gameData || this.currentGameData;

      // Check cache first
      const cacheKey = this.cacheService.generateKey({
        sortBy: currentState.sortBy,
        showAvailableOnly: currentState.showAvailableOnly,
        songsCount: Object.keys(songs).length,
        gamesCount: games.length
      });

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.updateState({
          ...cached,
          isLoading: false,
          isDataReady: true
        });
        return;
      }

      // Process data
      const availableGameIds = new Set(
        games
          .map(game => game.gameSerial)
          .filter(serial => serial !== null && serial !== undefined)
      );

      const result = this.songProcessingService.processData(
        songs,
        availableGameIds,
        currentState.sortBy,
        currentState.showAvailableOnly
      );

      const newState: Partial<SongSearchState> = {
        songs: result.songs,
        groupedSongs: result.groupedSongs,
        letterIndex: result.letterIndex,
        isLoading: false,
        isDataReady: true,
        error: null,
        totalSongs: result.songs.length,
        availableSongs: currentState.showAvailableOnly 
          ? result.songs.length 
          : this.songProcessingService.filterByAvailability(result.songs, availableGameIds).length
      };

      // Cache the result
      this.cacheService.set(cacheKey, {
        songs: newState.songs,
        groupedSongs: newState.groupedSongs,
        letterIndex: newState.letterIndex,
        totalSongs: newState.totalSongs,
        availableSongs: newState.availableSongs
      });

      this.updateState(newState);

    } catch (error) {
      this.handleError('processing', error);
    }
  }

  private updateState(partial: Partial<SongSearchState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partial });
  }

  private createViewModel(state: SongSearchState): SongSearchViewModel {
    return {
      state,
      hasData: state.songs.length > 0,
      isEmpty: !state.isLoading && state.songs.length === 0,
      showError: state.error?.hasError === true,
      showLoading: state.isLoading,
      showContent: state.isDataReady && !state.isLoading && state.songs.length > 0
    };
  }

  private handleError(context: string, error: any): void {
    this.errorHandlingService.logError(context, error);
    
    let errorState;
    switch (context) {
      case 'song-load':
        errorState = this.errorHandlingService.handleSongLoadError(error);
        break;
      case 'game-data':
        errorState = this.errorHandlingService.handleGameDataError(error);
        break;
      case 'processing':
        errorState = this.errorHandlingService.handleProcessingError(error);
        break;
      default:
        errorState = this.errorHandlingService.handleSongLoadError(error);
    }

    this.updateState({
      error: errorState,
      isLoading: false,
      isDataReady: false
    });
  }

  private scrollToLetter(letter: string): void {
    const element = document.getElementById(letter);
    const songsContainer = document.querySelector('.songs-container');
    if (element && songsContainer) {
      const containerRect = songsContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = elementRect.top - containerRect.top + songsContainer.scrollTop;
      (songsContainer as HTMLElement).scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  }

  private openSongDialog(song: SongLocations, filterAvailableOnly: boolean, sortBy: 'title' | 'artist'): void {
    this.dialog.open(SongSearchDialog, {
      height: '40%',
      width: '50%',
      maxWidth: '600px',
      data: {
        songData: song,
        filterAvailableOnly,
        sortBy
      }
    });
  }
}
