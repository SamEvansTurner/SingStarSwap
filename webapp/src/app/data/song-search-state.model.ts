import { SongLocations } from './songs-data.model';
import { GroupedSongs } from '../services/song-processing.service';
import { ErrorState } from '../services/error-handling.service';

export interface SongSearchState {
  // Data
  songs: SongLocations[];
  groupedSongs: GroupedSongs[];
  letterIndex: string[];
  
  // Filters and sorting
  sortBy: 'artist' | 'title';
  showAvailableOnly: boolean;
  
  // UI State
  isLoading: boolean;
  isDataReady: boolean;
  
  // Error handling
  error: ErrorState | null;
  
  // Statistics
  totalSongs: number;
  availableSongs: number;
}

export const initialSongSearchState: SongSearchState = {
  songs: [],
  groupedSongs: [],
  letterIndex: [],
  sortBy: 'artist',
  showAvailableOnly: true,
  isLoading: true,
  isDataReady: false,
  error: null,
  totalSongs: 0,
  availableSongs: 0
};

export interface SongSearchViewModel {
  // All the state data
  state: SongSearchState;
  
  // Computed properties
  hasData: boolean;
  isEmpty: boolean;
  showError: boolean;
  showLoading: boolean;
  showContent: boolean;
}
