import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { Disc, Song, SongsDB } from './songs-data.model';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SongsDataService {

  private songsDataSubject = new BehaviorSubject<SongsDB | null>(null);
  songsData$ = this.songsDataSubject.asObservable().pipe(filter((data): data is SongsDB => data !== null));

  constructor(private http: HttpClient, private location: Location) { 
    this.http.get(`${this.location.path(false)}/assets/singstar-songs.db.json`, {responseType: 'json'}).subscribe(
        { 
          next: (response) => {
            this.songsDataSubject.next(response as SongsDB);
          },
          error: (err) => {
            //FOR DEBUGGING: just use a single disk with a single song
            this.songsDataSubject.next({"SCES-52268": {
                                          "id": "SCES-52268",
                                          "title": "SingStar",
                                          "country": "UK",
                                          "language": "EN",
                                          "platform": "PS2",
                                          "songlist": [{"title": "Take On Me", "artist": "A-ha"}]
                                        }
                                      })
          }
        }
      )
  }

  get config(): Observable<SongsDB> {
    return this.songsData$;
  }
}
