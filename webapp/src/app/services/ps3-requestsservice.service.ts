import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { concatMap, catchError, tap, filter } from 'rxjs/operators';
import { GameData, Platforms } from '../data/game-data.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class PS3RequestService {

  ps3Address: string = "";
  unmountURL: string = "";
  ps2DiscMountURL: string = "";

  private requestQueue$ = new BehaviorSubject<{ url: string, subject: BehaviorSubject<any> } | null>(null);  // Queue for URL and subject

  private ps2ISODataXMLURL = "";
  private ps2ISODataSubject = new BehaviorSubject<string | null>(null);
  public ps2ISOMountURL$ = this.ps2ISODataSubject.asObservable().pipe(filter((data): data is string => data !== null));

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.requestQueue$.pipe(
      concatMap((requestData) => {
          if (!requestData) return of(null); 
          return this.sendRequest(requestData.url).pipe(
            // Emit the response to the subject
            tap((response) => {requestData.subject.next(response); requestData.subject.complete()}),
            catchError((error) => {
              // Emit error if request fails
              requestData.subject.error(error);
              return of(null);
            })
          );
      })
    ).subscribe(); 

    configService.config.subscribe(
      data => {
        if (data) {
          this.ps3Address = "http://" + data?.PS3.address;
          this.unmountURL = this.ps3Address + "/mount_ps3/unmount"
          this.ps2ISODataXMLURL = "http://" + data?.PS3.address + "/dev_hdd0/xmlhost/game_plugin/mygames.xml";
          this.fetchPS2ISOData();
        }
      });

    this.ps2ISOMountURL$.subscribe(
      data => {
        this.ps2DiscMountURL = data;
      }
    )
  }

  // Method to enqueue a request and return the subject to the component
  fetchHttp(url: string): Observable<any> {
    const responseSubject = new BehaviorSubject<any>(null);  // Create a new subject for this request

    // Add the request URL and subject to the queue for sequential processing
    this.requestQueue$.next({ url, subject: responseSubject });

    // Return the subject's observable to the component to subscribe to. Filter out null values
    return responseSubject.asObservable().pipe(filter(data => data !== null));
  }

  loadDisc(game: GameData) {
    if (!this.unmountURL) {
      console.error("failed to unmont")
      return
    }
    this.fetchHttp(this.unmountURL).subscribe(
      { 
        next: () => {
          if(game.platform == Platforms.PS2) {
            setTimeout(this.loadPS2Disc.bind(this, game), 1000);
          } else {
            setTimeout(this.loadPS3Disc.bind(this, game), 1000);
          }
        },
        error: (err) => {
          console.error("error in unmounting: ", err);
        }
      }
    )

  }

  private loadPS2Disc(game: GameData) {
    if (!this.ps2DiscMountURL) {
      console.error("PS2 Disc URL is unset")
      return
    }
    this.fetchHttp(game.mountUrl).subscribe(
      {
        next: () => {
          this.fetchHttp(this.ps2DiscMountURL).subscribe(
            {
              next: () => {
              },
              error: (err) => {
                console.error("error in ps2 disc mount: ", err);
              }
            }
          )
        },
        error: (err) => {
          console.error("error in ps2 data mount: ", err);
        }
      }
    )
  }

  private loadPS3Disc(game: GameData) {
    this.fetchHttp(game.mountUrl).subscribe(
      {
        next: () => {
        },
        error: (err) => {
          console.error("error in ps3 disc mount: ", err);
        }
      }
    )
  }

  private fetchPS2ISOData() {
    this.fetchHttp(this.ps2ISODataXMLURL).subscribe(
      { 
        next: (response) => {
          this.processPS2ISOData(response)
        },
        error: (err) => {
          console.error("error in ps2dataservice: ", err);
        }
      }
    );
  }

  
  private processPS2ISOData(response : string | null) {
    if (typeof(response) == 'string') {
      // For some reason webmanmod has odd extra non-valid xml tags and parses all data with regex.
      // Remove the extra tags and just parse as xml.
      var sanitizedStr = response.replaceAll(new RegExp('<>(.*?)</>', 'g'), '$1')
      var domParser = new DOMParser();
      var xmlDocument = domParser.parseFromString(sanitizedStr, 'text/xml');
      var ps2Segment = xmlDocument.querySelector("V[id=seg_wm_ps2_items]");
      //We only need the first entry with an action - this is an iso file that we can use to force the PS3 to recognize a PS2 disk inserted.
      var diskMountURL = ps2Segment?.querySelector("P[key=module_action]")
      var content = diskMountURL?.textContent;
      if (content) {
        this.ps2ISODataSubject.next(this.ps3Address + content);
      }
    }
  }

  // Send the HTTP request and return the observable
  private sendRequest(url: string): Observable<any> {
    return this.http.get(url, {responseType: 'text'});  // No error handling here; let the error propagate naturally
  }

}
