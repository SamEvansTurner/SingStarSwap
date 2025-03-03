import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { SongsDataService } from './songs.data.service';
import { GameData, Platforms, GameData_EMPTY } from '../data/game-data.model';
import { PS3RequestService } from './ps3-requestsservice.service';

@Injectable({
  providedIn: 'root'
})
export class PS2DataService {
  public ps3Address = "";
  public apiUrl = "";
  private ps2CoverDatabaseURL = "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg";
  private ps2GameDataSubject = new BehaviorSubject<string | null>(null);
  private ps2GameData$ = this.ps2GameDataSubject.asObservable().pipe(filter((data): data is string => data !== null));
  private ps2ISODataXMLURL = "";
  private ps2ISODataSubject = new BehaviorSubject<string | null>(null);
  private ps2ISOMountURL$ = this.ps2ISODataSubject.asObservable().pipe(filter((data): data is string => data !== null));
  private gameDataSubject = new BehaviorSubject<GameData | null>(null);
  private gameData$ = this.gameDataSubject.asObservable().pipe(filter((data): data is GameData => data !== null));
  private interimData : Map <string, GameData> = new Map<string, GameData>();
  private ps2SerialRegex : RegExp = /SCES|SLES|SCUS|SLUS/; //Maybe need to add extras here. But for now leave like this.
  public titlefilter = "";
  
  constructor(private configService: ConfigService, private songDatabase: SongsDataService, private ps3RequestService: PS3RequestService) { 
    configService.config.subscribe(
      data => {
        if (data) {
          this.ps3Address = "http://" + data?.address;
          this.apiUrl = "http://" + data?.address + "" + data?.ps2path;
          this.titlefilter = data?.titlefilter;
          this.ps2ISODataXMLURL = "http://" + data?.address + "/dev_hdd0/xmlhost/game_plugin/mygames.xml";
          this.fetchSingStarGameData();
          this.fetchPS2ISOData();
          this.ps2GameData$.subscribe({
            next: this.processSingStarGameFolderData.bind(this)
          });
        }
      }
    )
  }

  private fetchSingStarGameData() {
    this.ps3RequestService.makeRequest(this.apiUrl).subscribe( 
      { 
        next: (response) => {
          this.ps2GameDataSubject.next(response)
        },
        error: (err) => {
          console.error("error in ps2dataservice: ", err);
        }
      }
    );
  }

  private fetchPS2ISOData() {
    this.ps3RequestService.makeRequest(this.ps2ISODataXMLURL).subscribe(
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

  private processSingStarGameFolderData(data: string) {
    var domParser = new DOMParser();
    var htmlElement = domParser.parseFromString(data, 'text/html');
    var tableObject = htmlElement.querySelector("table[id=files]")
    var dirs = tableObject?.querySelectorAll("a[class=d]")
    dirs?.forEach((item, iterator) => {
      if (item.innerHTML.toLowerCase().includes(this.titlefilter.toLowerCase())) {
        var cols = item.parentElement?.parentElement?.querySelectorAll("td")
        var keyRef = cols?.item(0).querySelector("a")?.getAttribute("href") as string
        var keyR = this.apiUrl + "/" + keyRef
        var mountLinkRef = cols?.item(1).querySelector("a")?.getAttribute("href") as string
        var mountLink = this.toUrl(mountLinkRef)
        // This seems to crash webmanmod. Maybe there's a way to send the requests in a queue or something?
        this.getGameID(encodeURI(keyR))
        if (keyR && mountLink) {
          this.interimData.set(encodeURI(keyR), {
            key: keyR,
            platform: Platforms.PS2,
            name: item.innerHTML + '\n',
            mountUrl: encodeURI(mountLink.replace("mount.ps3", "mount.ps2"))});
          
        }
      }
    }
    )
  } 

  private getGameID(url: string) {
    this.ps3RequestService.makeRequest(url).subscribe(
      { 
        next: this.PublishGameWithID.bind(this, url),
        error: (err) => {
          console.error("error in ps2dataservice: ", err);
        }
      }
    );

  }

  private PublishGameWithID(url: string, data: string) {
    var ourGame : GameData = this.interimData.get(url) ?? GameData_EMPTY;
    if (ourGame === GameData_EMPTY) return;

    var domParser = new DOMParser();
    var htmlElement = domParser.parseFromString(data, 'text/html');
    var gameIDs = htmlElement.querySelectorAll("a.w");
    gameIDs.forEach( gameID => {
      var matches = this.ps2SerialRegex.exec(gameID.innerHTML);
      if (matches) {
        ourGame.gameSerial = gameID.innerHTML.replace("_", "-").replace(".", "");
      }
      
    })

    this.gameDataSubject.next(ourGame);
    this.interimData.delete(url);
  }

  public getSingStarGameData(): Observable<GameData> {
      return this.gameData$;
  }

  public getPS2MountURL(): Observable<string> {
    return this.ps2ISOMountURL$;
  }

  public toUrl(href: string) : string {
    return this.ps3Address + href
  }
}