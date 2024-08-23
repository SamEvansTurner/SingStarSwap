import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { SongsDB, Song, Disc } from '../data/songs-data.model';
import { SongsDataService } from '../data/songs.data.service';
import { first } from 'rxjs';


export interface SongLocations {
  title: string;
  artist: string;
  discids: string[];
}


@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [MatSidenavModule, MatExpansionModule],
  templateUrl: './songsearch.component.html',
  styleUrl: './songsearch.component.css'
})
export class SongsearchComponent {
  data : SongsDB = {};
  songData : Map<string, SongLocations> = new Map<string, SongLocations>();
  countryFilter : Array<string> = [];//["AU", "EU", "US"];
  private letterSet : Set<string> = new Set<string>();
  private countrySet : Set<string> = new Set<string>();
  sortByArtist : boolean = true;
  groupedItems : { letter: string, items: SongLocations[]}[] = [];

  constructor(private dataService: SongsDataService) { }

  sortData() {
    this.letterSet.clear()
    if (this.sortByArtist) {
      this.songData = new Map<string, SongLocations>([...this.songData].sort((a,b) => String(a[1].artist).localeCompare(String(b[1].artist))));
      ([...this.songData]).map((song) => {
        var firstChar = song[1].artist.codePointAt(0)
        if (firstChar) {
          this.letterSet.add(String.fromCodePoint(firstChar))
        }
      })
    } else {
      this.songData = new Map<string, SongLocations>([...this.songData].sort((a,b) => String(a[1].title).localeCompare(String(b[1].title))));
      ([...this.songData]).map((song) => {
        var firstChar = song[1].title.codePointAt(0)
        if (firstChar) {
          this.letterSet.add(String.fromCodePoint(firstChar))
        }
      })
    }
    this.groupItems()

  }

  groupItems() {
    if (this.sortByArtist) {
      const grouped = ([...this.letterSet]).map(letter => ({
        letter, items: ([...this.songData]).filter(item => item[1].artist.startsWith(letter)).map((v) => v[1])
      }));
      this.groupedItems = grouped.filter(group => group.items.length > 0);
    }
  }

  createSongListFromDiscs(data : SongsDB) {
    this.data = data
    var discs: Disc[] = Object.values(data)
    discs.forEach( disc => {
      this.countrySet.add(disc.country);
      if ((this.countryFilter.length > 0 && this.countryFilter.includes(disc.country)) || this.countryFilter.length == 0) {
        disc.songlist.forEach (song => {
          var list = this.songData.get(song.artist+song.title)
          if(list) {
            list.discids.push(disc.id)
          } else {
            this.songData.set(song.artist+song.title, {artist: song.artist, title:song.title, discids: [disc.id]})
          }
        }
        )
      }
    })
    this.sortData()
  }

  ngOnInit() : void {
    var singStarGameData = this.dataService.songsData$
    singStarGameData.subscribe(
      {
        next: this.createSongListFromDiscs.bind(this)
      }
    )
  }

  dataList() : Disc[] {
    return Object.values(this.data)
  }

  discTitle(id: string) : string {
    if (this.data) {
      var disc = this.data[id]
      if (disc) {
        return disc.title + " (" + disc.country + ")" + " [" + disc.platform + "]"
      }
      return "ERRORGETTINGDISC"
      
    }
    return "ERRORGETTINGTITLE"
    
  }

  getTitles(songIdentifier: string) {
    return this.songData.get(songIdentifier)?.discids
  }

  handleClick(item: any) {
    console.log(item)
  }

  scrollTo(letter: string) {
    const element = document.getElementById(letter);
    if(element) {
      element.scrollIntoView({behavior:'smooth'})
    }
  }

  settings() {
    
  }
}
