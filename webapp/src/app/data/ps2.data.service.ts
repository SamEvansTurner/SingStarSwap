import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, filter, firstValueFrom, Observable, of, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { SongsDataService } from './songs.data.service';

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
  public folderFilter = "";
  public ps2MountURL = "";
  
  constructor(private http: HttpClient, private configService: ConfigService, private songDatabase: SongsDataService) { 
    configService.config.subscribe(
      data => {
        if (data) {
          this.ps3Address = "http://" + data?.address;
          this.apiUrl = "http://" + data?.address + "" + data?.ps2path;
          this.folderFilter = data?.ps2folderfilter;
          this.ps2MountURL = "http://" + data?.address + "/mount_ps2/"
          this.ps2ISODataXMLURL = "http://" + data?.address + "/dev_hdd0/xmlhost/game_plugin/mygames.xml";
          this.fetchSingStarGameData();
          this.fetchPS2ISOData()
        }
      }
    )
  }

  private fetchSingStarGameData() {
    this.http.get(this.apiUrl, {responseType: 'text'}).subscribe(
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
    this.http.get(this.ps2ISODataXMLURL, {responseType: 'text'}).subscribe(
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

  public getSingStarGameData(): Observable<string> {
      return this.ps2GameData$;
  }

  public getPS2ISOMountURL(): Observable<string> {
      return this.ps2ISOMountURL$;
  }

  public toUrl(href: string) : string {
    return this.ps3Address + href
  }
}