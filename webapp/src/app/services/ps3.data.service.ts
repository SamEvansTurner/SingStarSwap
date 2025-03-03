import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { SongsDataService } from './songs.data.service';
import { GameData, Platforms } from '../data/game-data.model';
import { PS3RequestService } from './ps3-requestsservice.service';

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
          this.ps3Address = "http://" + data?.address;
          this.apiUrl = "http://" + data?.address + "" + data?.ps3path;
          this.titleFilter = data?.titlefilter;
          this.ps3ISODataXMLURL = "http://" + data?.address + "/dev_hdd0/xmlhost/game_plugin/mygames.xml";
          this.fetchPS3ISOData()
        }
      }
    )
  }

  private fetchPS3ISOData() {
    this.ps3RequestService.makeRequest(this.ps3ISODataXMLURL).subscribe(
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
      //We only need the first entry with an action - this is an iso file that we can use to force the PS3 to recognize a PS2 disk inserted.
      var disks = ps3Segment?.querySelectorAll("T");
      disks?.forEach((item, iterator) => {
        var mountURL = item.querySelector("P[key=module_action]")?.innerHTML ?? '';
        var keyURL = mountURL;
        var title = item.querySelector("P[key=title]")?.innerHTML ?? '';
        var icon = item.querySelector("P[key=icon]")?.innerHTML ?? '';
        var serial = /([^/]+).JPG\/?$/.exec(icon)
        if (title.includes(this.titleFilter)) {
          this.gameDataSubject.next({
            key: this.ps3Address + keyURL.replace("/mount_ps3/","/"),
            platform: Platforms.PS3,
            name: title + '\n',
            mountUrl: encodeURI(this.ps3Address + mountURL),
            gameSerial: serial ? serial[1].replace(/(....)/, "$1-") : ''
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
