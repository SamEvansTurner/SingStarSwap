import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { Config } from '../data/config-data.model';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configSubject = new BehaviorSubject<Config | null>(null);
  config$ = this.configSubject.asObservable().pipe(filter((data): data is Config => data !== null));

  constructor(private http: HttpClient, private location: Location) { 
    this.http.get(`${this.location.path(false)}/settings.json`, {responseType: 'json'}).subscribe(
        { 
          next: (response) => {
            this.configSubject.next(response as Config);
          },
          error: (err) => {
            //FOR DEBUGGING: just set default values
            this.configSubject.next({
              address:"192.168.21.30",
              ps2path:"/dev_hdd0/SINGSTAR",
              ps2isopath:"/dev_hdd0/PS2ISO",
              titlefilter:"SingStar",
              ps3path:"/net0/PS3ISO",
              ps3isofilter:"SingStar"})
          }
        }
      )
  }

  get config(): Observable<Config> {
    return this.config$
  }
}
