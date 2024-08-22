import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SongsDB, Song, Disc } from '../data/songs-data.model';
import { SongsDataService } from '../data/songs.data.service';


export interface SongLocation {
  title: string;
  artist: string;
  discid: string;
}


@Component({
  selector: 'app-songsearch',
  standalone: true,
  imports: [MatSidenavModule],
  templateUrl: './songsearch.component.html',
  styleUrl: './songsearch.component.css'
})
export class SongsearchComponent {
  data : SongsDB = {}
  songData : Map<string, SongLocation[]> = new Map<string, SongLocation[]>()

  constructor(private dataService: SongsDataService) { }

  createSongListFromDiscs(data : SongsDB) {
    this.data = data
    var discs: Disc[] = Object.values(data)
    discs.forEach( disc => {
      disc.songlist.forEach (song => {
        var list = this.songData.get(song.artist+song.title)
        if(list) {
          list.push({artist: song.artist, title:song.title, discid: disc.id})
        } else {
          this.songData.set(song.artist+song.title, [{artist: song.artist, title:song.title, discid: disc.id}])
        }
      }
      )
    })
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
    return this.songData.get(songIdentifier)
  }

  handleClick(item: any) {
    console.log(item)
  }
}
