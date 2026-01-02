import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { SongsDataService } from './songs.data.service';
import { GameData, Platforms } from '../data/game-data.model';
import { PS3RequestService } from './ps3-requestsservice.service';
import { buildSafeUrl, sanitizePath } from '../utils/url-utils';

@Injectable({
  providedIn: 'root'
})
export class PS3DataService {
  public ps3Address = "";
  public apiUrl = "";
  private titleFilter = "SingStar";
  private ps3ISODataXMLURL = "";
  private gameDataSubject = new BehaviorSubject<GameData | null>(null);
  private gameData$ = this.gameDataSubject.asObservable().pipe(filter((data): data is GameData => data !== null));
  
  
  constructor(private configService: ConfigService, private songDatabase: SongsDataService, private ps3RequestService: PS3RequestService) { 
    configService.config.subscribe(
      data => {
        if (data) {
          this.ps3Address = buildSafeUrl(data?.PS3.address);
          this.apiUrl = buildSafeUrl(data?.PS3.address, sanitizePath(data?.PS3.ps3path));
          this.titleFilter = data?.PS3.titlefilter;
          this.ps3ISODataXMLURL = buildSafeUrl(data?.PS3.address, '/dev_hdd0/xmlhost/game_plugin/mygames.xml');
          this.fetchPS3ISOData()
        }
      }
    )
  }

  private fetchPS3ISOData() {
    this.ps3RequestService.fetchHttp(this.ps3ISODataXMLURL).subscribe(
      { 
        next: (response) => {
          this.processPS3ISOData(response)
        },
        error: (err) => {
          console.error("error in ps3dataservice: ", err);
        }
      }
    );
  }

  private processPS3ISOData(response : string | null) {
    if (typeof(response) == 'string') {
      // For some reason webmanmod has odd extra non-valid xml tags and parses all data with regex.
      // Remove the extra tags and just parse as xml.
      var sanitizedStr = response.replaceAll(new RegExp('<>(.*?)</>', 'g'), '$1');
      var domParser = new DOMParser();
      var xmlDocument = domParser.parseFromString(sanitizedStr, 'text/xml');
      var ps3Segment = xmlDocument.querySelector("V[id=seg_wm_ps3_items]");
      var disks = ps3Segment?.querySelectorAll("T");
      disks?.forEach((item, iterator) => {
        var mountURL = item.querySelector("P[key=module_action]")?.textContent ?? ''; // Use textContent to prevent XSS
        var keyURL = mountURL;
        var title = item.querySelector("P[key=title]")?.textContent ?? ''; // Use textContent to prevent XSS
        var icon = item.querySelector("P[key=icon]")?.textContent ?? ''; // Use textContent to prevent XSS
        var serial = /([^/]+).JPG\/?$/.exec(icon)
        if (title.includes(this.titleFilter)) {
          this.gameDataSubject.next({
            key: buildSafeUrl(this.ps3Address, keyURL.replace("/mount_ps3/","/")),
            platform: Platforms.PS3,
            name: title + '\n',
            mountUrl: buildSafeUrl(this.ps3Address, mountURL),
            gameSerial: serial ? serial[1].replace(/(....)/, "$1-") : '',
            imageUrl: '/api/ps3' + icon
          });
        }
      });
    }
  }

  public getSingStarGameData(): Observable<GameData> {
      return this.gameData$;
  }

  public toUrl(href: string) : string {
    return this.ps3Address + href
  }

}
