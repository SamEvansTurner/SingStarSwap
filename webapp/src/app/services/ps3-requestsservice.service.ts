import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, Subscription, throwError } from 'rxjs';
import { concatMap, catchError, tap, filter, delay, switchMap } from 'rxjs/operators';
import { GameData, Platforms } from '../data/game-data.model';
import { ConfigService } from './config.service';
import { buildSafeUrl } from '../utils/url-utils';

@Injectable({
  providedIn: 'root'
})
export class PS3RequestService implements OnDestroy {

  ps3Address: string = "";
  unmountURL: string = "";
  ps2DiscMountURL: string = "";

  private requestQueue$ = new BehaviorSubject<{ url: string, subject: BehaviorSubject<any> } | null>(null);  // Queue for URL and subject

  private ps2ISODataXMLURL = "";
  private ps2ISODataSubject = new BehaviorSubject<string | null>(null);
  public ps2ISOMountURL$ = this.ps2ISODataSubject.asObservable().pipe(filter((data): data is string => data !== null));

  private subscriptions = new Subscription();

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.subscriptions.add(
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
      ).subscribe()
    );

    this.subscriptions.add(
      configService.config.subscribe(
      data => {
        if (data) {
          this.ps3Address = buildSafeUrl(data?.PS3.address);
          this.unmountURL = buildSafeUrl(this.ps3Address, "/mount_ps3/unmount");
          this.ps2ISODataXMLURL = buildSafeUrl(data?.PS3.address, "/dev_hdd0/xmlhost/game_plugin/mygames.xml");
          this.fetchPS2ISOData();
        }
      })
    );

    this.subscriptions.add(
      this.ps2ISOMountURL$.subscribe(
      data => {
        this.ps2DiscMountURL = data;
      }
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.requestQueue$.complete();
    this.ps2ISODataSubject.complete();
  }

  // Method to enqueue a request and return the subject to the component
  fetchHttp(url: string): Observable<any> {
    const responseSubject = new BehaviorSubject<any>(null);  // Create a new subject for this request

    // Add the request URL and subject to the queue for sequential processing
    this.requestQueue$.next({ url, subject: responseSubject });

    // Return the subject's observable to the component to subscribe to. Filter out null values
    return responseSubject.asObservable().pipe(filter(data => data !== null));
  }

  loadDisc(game: GameData): void {
    if (!this.unmountURL) {
      console.error("failed to unmount");
      return;
    }

    // Chain operations with RxJS operators instead of setTimeout callbacks
    this.fetchHttp(this.unmountURL).pipe(
      delay(1000), // Replace setTimeout with RxJS delay
      switchMap(() => {
        // Choose appropriate loading method based on platform
        if (game.platform === Platforms.PS2) {
          return this.loadPS2DiscRx(game);
        } else {
          return this.loadPS3DiscRx(game);
        }
      })
    ).subscribe({
      next: () => {
        // Disc loading completed successfully
      },
      error: (err) => {
        console.error("error in disc loading:", err);
      }
    });
  }

  /**
   * Load PS2 disc using Observable chain (no callbacks)
   */
  private loadPS2DiscRx(game: GameData): Observable<any> {
    if (!this.ps2DiscMountURL) {
      console.error("PS2 Disc URL is unset");
      return throwError(() => new Error("PS2 Disc URL is unset"));
    }

    return this.fetchHttp(game.mountUrl).pipe(
      delay(100), // Small delay between mounts
      switchMap(() => this.fetchHttp(this.ps2DiscMountURL)),
      catchError((err) => {
        console.error("error in ps2 disc mount:", err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Load PS3 disc using Observable (no callbacks)
   */
  private loadPS3DiscRx(game: GameData): Observable<any> {
    return this.fetchHttp(game.mountUrl).pipe(
      catchError((err) => {
        console.error("error in ps3 disc mount:", err);
        return throwError(() => err);
      })
    );
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
        this.ps2ISODataSubject.next(buildSafeUrl(this.ps3Address, content));
      }
    }
  }

  // Send the HTTP request via proxy (timeout and retry logic handled by backend)
  private sendRequest(url: string): Observable<any> {
    // Extract path from URL to send to proxy
    const urlObj = new URL(url);
    const proxyPath = urlObj.pathname + urlObj.search;
    const proxyUrl = '/api/ps3' + proxyPath;
    
    return this.http.get(proxyUrl, {responseType: 'text'}).pipe(
      catchError(error => {
        console.error(`Proxied request to ${url} failed:`, error);
        return throwError(() => error);
      })
    );
  }

}
