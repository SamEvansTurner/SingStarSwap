import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { SongLocations, SongsDB } from '../../data/songs-data.model';
import { SongsDataService } from '../../services/songs.data.service';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { asyncScheduler, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [MatExpansionModule, MatButtonToggleModule, FormsModule, MatSidenavModule],
  templateUrl: './songsearch.component.html',
  styleUrls: ['./songsearch.component.css']
})
export class SongsearchComponent implements OnInit {
  @ViewChild('settingsdrawer') settingsdrawer!: MatDrawer;
  
  data$!: Observable<SongsDB>;
  songList: SongLocations[] = [];
  countryFilter: string[] = [];
  sortByKey: keyof SongLocations = 'artist'; 
  groupedItems: { letter: string, items: SongLocations[] }[] = [];
  letterArray: string[] = [];

  constructor(private dataService: SongsDataService, private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.data$  = this.dataService.songsData$;
    this.data$.subscribe((data) => {
      this.createSongListFromDiscs(data);
      this.sortData();
    });
  }

  private createSongListFromDiscs(data: SongsDB): void {
    const songData = new Map<string, SongLocations>();

    Object.values(data).forEach((disc) => {
      if (this.countryFilter.length === 0 || this.countryFilter.includes(disc.country)) {
        disc.songlist.forEach((song) => {
          const songKey = `${song.artist}${song.title}`;
          const discInfo = { id: disc.id, title: this.discTitle(disc.id) };

          if (songData.has(songKey)) {
            songData.get(songKey)!.discids.push(discInfo);
          } else {
            songData.set(songKey, { artist: song.artist, title: song.title, discids: [discInfo] });
          }
        });
      }
    });

    this.songList = Array.from(songData.values());
    this.buildLetterArray();
    this.groupItems();
  }

  private buildLetterArray(): void {
    const firstLetters = new Set<string>();
    this.songList.forEach((song) => {
      const value = song[this.sortByKey];
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
        const value = item[this.sortByKey];
        return typeof value === 'string' && value.charAt(0).toUpperCase() === letter;
      }),
    }));
  }

  private discTitle(id: string): string {
    let discTitle = 'ERRORGETTINGTITLE';
    this.data$.subscribe((data) => {
      const disc = data[id];
      if (disc) {
        discTitle = `${disc.title} (${disc.country}) [${disc.platform}]`;
      }
    });
    return discTitle;
  }

  sortOrderToggle(event: MatButtonToggleChange): void {
    this.sortByKey = event.value as keyof SongLocations;  
    asyncScheduler.schedule(() => {this.sortData()});
  }

  private sortData(): void {
    this.cdRef.detach();
    this.songList = this.songList.sort((a, b) => {
      const valueA = String(a[this.sortByKey]);
      const valueB = String(b[this.sortByKey]);
      return valueA.localeCompare(valueB);
    });
    this.buildLetterArray();
    this.groupItems();
    this.cdRef.detectChanges();
    this.cdRef.reattach();
  }

  scrollTo(letter: string): void {
    const element = document.getElementById(letter);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  getTitles(song: SongLocations): string[] {
    return song.discids.map(disc => disc.title);  // Return an array of titles
  }
}
