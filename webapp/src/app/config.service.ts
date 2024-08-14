import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OnInit } from '@angular/core';
import { of, tap, BehaviorSubject } from 'rxjs';
import { Config } from './config-data.model';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configSubject = new BehaviorSubject<Config | null>(null);
  config$ = this.configSubject.asObservable();

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
              ps2isopath:"/net0/PS3ISO",
              ps2folderfilter:"SingStar",
              ps3path:"/net0/PS3ISO",
              ps3isofilter:"SingStar"})
          }
        }
      )
  }

  get config(): Config | null {
    return this.configSubject.value;
  }
}
