import { Component, ViewChild } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { SongsDB, Song, Disc } from '../data/songs-data.model';
import { SongsDataService } from '../data/songs.data.service';
import { MatLabel } from '@angular/material/form-field';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';

export interface DiscID {
  id: string;
  title: string;
}

export interface SongLocations {
  title: string;
  artist: string;
  discids: DiscID[];
}


@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [MatSidenavModule, MatExpansionModule, MatButtonToggleModule, FormsModule],
  templateUrl: './songsearch.component.html',
  styleUrl: './songsearch.component.css'
})
export class SongsearchComponent {
  @ViewChild('settingsdrawer') settingsdrawer!: MatDrawer;
  data : SongsDB = {};
  private songData : Map<string, SongLocations> = new Map<string, SongLocations>();
  songList : Array<SongLocations> = new Array<SongLocations>();
  countryFilter : Array<string> = [];//["AU", "EU", "US"];
  private letterSet : Set<string> = new Set<string>();
  letterArray : Array<string> = new Array<string>();
  private countrySet : Set<string> = new Set<string>();
  sortByKey : string = "artist";
  groupedItems : { letter: string, items: SongLocations[]}[] = [];


  constructor(private dataService: SongsDataService) { }

  sortData() {
    this.songList = [...this.songData].sort((a,b) => {
      let key = this.sortByKey as keyof typeof a[1];
      return String(a[1][key]).localeCompare(String(b[1][key]))
    }).map(a=>a[1]);
    this.buildLetterSet();
    this.groupItems();

  }

  buildLetterSet() {
    this.letterSet.clear();
    this.songList.map((song) => {
      let key = this.sortByKey as keyof typeof song
      var firstChar = String(song[key]).codePointAt(0)
      if (firstChar) {
        this.letterSet.add(String.fromCodePoint(firstChar))
      }
    })
    this.letterArray = [...this.letterSet];
  }

  groupItems() {
    const grouped = ([...this.letterArray]).map(letter => ({
      
      letter, items: this.songList.filter(item => {
        let key = this.sortByKey as keyof typeof item
        return String(item[key]).startsWith(letter)
      })
    }));
    this.groupedItems = grouped.filter(group => group.items.length > 0);
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
            list.discids.push({id: disc.id, title: this.discTitle(disc.id)})
          } else {
            this.songData.set(song.artist+song.title, {artist: song.artist, title:song.title, discids: [{id: disc.id, title: this.discTitle(disc.id)}]})
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

  sortOrderToggle(event: MatButtonToggleChange) {
    this.sortByKey = event.value
    this.sortData()
  }
}
