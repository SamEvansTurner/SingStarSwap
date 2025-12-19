import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { SongLocations } from '../../../data/songs-data.model';
import { GroupedSongs } from '../../../services/song-processing.service';

@Component({
  selector: 'app-song-group',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule
  ],
  templateUrl: './song-group.component.html',
  styleUrls: ['./song-group.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongGroupComponent {
  @Input() group!: GroupedSongs;
  @Input() sortBy: 'artist' | 'title' = 'artist';

  @Output() songSelect = new EventEmitter<SongLocations>();

  onSongClick(song: SongLocations): void {
    this.songSelect.emit(song);
  }

  getSongDisplayText(song: SongLocations): string {
    return this.sortBy === 'artist'
      ? `${song.artist} - ${song.title}`
      : `${song.title} by ${song.artist}`;
  }

  trackBySong(index: number, song: SongLocations): string {
    return `${song.artist}:${song.title}`;
  }
}
