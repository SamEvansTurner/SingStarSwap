import { Injectable } from '@angular/core';
import { SongsDB, SongLocations, DiscID, Song } from '../data/songs-data.model';

export interface GroupedSongs {
  letter: string;
  songs: SongLocations[];
}

export interface ProcessingResult {
  songs: SongLocations[];
  groupedSongs: GroupedSongs[];
  letterIndex: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SongProcessingService {

  /**
   * Process songs database into a flat array of SongLocations
   * O(n) implementation - single pass through all discs and songs
   */
  processSongsFromDatabase(songsDB: SongsDB): SongLocations[] {
    const songMap = new Map<string, SongLocations>();

    // Single pass through all discs and songs
    Object.values(songsDB).forEach(disc => {
      disc.songlist.forEach(song => {
        const songKey = this.generateSongKey(song);
        const discInfo = this.createDiscInfo(disc);

        const existingSong = songMap.get(songKey);
        if (existingSong) {
          existingSong.discids.push(discInfo);
        } else {
          songMap.set(songKey, this.createSongLocation(song, discInfo));
        }
      });
    });

    return Array.from(songMap.values());
  }

  /**
   * Filter songs by availability based on available game IDs
   */
  filterByAvailability(songs: SongLocations[], availableGameIds: Set<string>): SongLocations[] {
    return songs.filter(song =>
      song.discids.some(disc => availableGameIds.has(disc.id))
    );
  }

  /**
   * Sort songs by specified field
   */
  sortSongs(songs: SongLocations[], sortBy: 'artist' | 'title'): SongLocations[] {
    return [...songs].sort((a, b) => {
      const valueA = a[sortBy].toLowerCase();
      const valueB = b[sortBy].toLowerCase();
      return valueA.localeCompare(valueB);
    });
  }

  /**
   * Group songs by first letter and create letter index
   */
  groupSongsByLetter(songs: SongLocations[], sortBy: 'artist' | 'title'): ProcessingResult {
    const groupMap = new Map<string, SongLocations[]>();
    const letterSet = new Set<string>();

    // Group songs by first letter
    songs.forEach(song => {
      const value = song[sortBy];
      if (value && value.length > 0) {
        const firstLetter = value.charAt(0).toUpperCase();
        letterSet.add(firstLetter);

        if (!groupMap.has(firstLetter)) {
          groupMap.set(firstLetter, []);
        }
        groupMap.get(firstLetter)!.push(song);
      }
    });

    // Create sorted letter index
    const letterIndex = Array.from(letterSet).sort();

    // Create grouped songs array
    const groupedSongs: GroupedSongs[] = letterIndex.map(letter => ({
      letter,
      songs: groupMap.get(letter) || []
    }));

    return {
      songs,
      groupedSongs,
      letterIndex
    };
  }

  /**
   * Complete processing pipeline
   */
  processData(
    songsDB: SongsDB,
    availableGameIds: Set<string>,
    sortBy: 'artist' | 'title',
    showAvailableOnly: boolean
  ): ProcessingResult {
    // Step 1: Convert database to song array
    let songs = this.processSongsFromDatabase(songsDB);

    // Step 2: Filter by availability if needed
    if (showAvailableOnly) {
      songs = this.filterByAvailability(songs, availableGameIds);
    }

    // Step 3: Sort songs
    songs = this.sortSongs(songs, sortBy);

    // Step 4: Group by letter and create index
    return this.groupSongsByLetter(songs, sortBy);
  }

  /**
   * Generate display text for a song based on sort order
   */
  getSongDisplayText(song: SongLocations, sortBy: 'artist' | 'title'): string {
    return sortBy === 'artist'
      ? `${song.artist} - ${song.title}`
      : `${song.title} by ${song.artist}`;
  }

  // Private helper methods
  private generateSongKey(song: Song): string {
    return `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
  }

  private createDiscInfo(disc: any): DiscID {
    return {
      id: disc.id,
      title: disc.title,
      fulltitle: `${disc.title} (${disc.country}) [${disc.platform}]`
    };
  }

  private createSongLocation(song: Song, discInfo: DiscID): SongLocations {
    return {
      artist: song.artist,
      title: song.title,
      discids: [discInfo]
    };
  }
}
