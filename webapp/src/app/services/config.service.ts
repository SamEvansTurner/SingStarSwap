import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable, tap } from 'rxjs';
import { Config, SaveConfigResponse } from '../data/config-data.model';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configSubject = new BehaviorSubject<Config | null>(null);
  config$ = this.configSubject.asObservable().pipe(filter((data): data is Config => data !== null));

  private configLoadedFromServerSubject = new BehaviorSubject<boolean>(false);
  configLoadedFromServer$ = this.configLoadedFromServerSubject.asObservable();

  constructor(private http: HttpClient, private location: Location) { 
    this.loadConfig();
  }

  private loadConfig(): void {
    this.http.get(`${this.location.path(false)}/api/config`, {responseType: 'json'}).subscribe(
        { 
          next: (response) => {
            this.configSubject.next(response as Config);
            this.configLoadedFromServerSubject.next(true);
          },
          error: (err) => {
            //FOR DEBUGGING: just set default values
            this.configSubject.next({
              server: {
                port: 4200
              },
              PS3: {
                address: "192.168.1.2",
                ps2path: "/dev_hdd0/SINGSTAR",
                titlefilter: "SingStar",
                ps3path: "/net0/PS3ISO"
              }
            });
            this.configLoadedFromServerSubject.next(false);
          }
        }
      )
  }

  get config(): Observable<Config> {
    return this.config$
  }

  saveConfig(config: Config): Observable<SaveConfigResponse> {
    return this.http.put<SaveConfigResponse>(`${this.location.path(false)}/api/config`, config).pipe(
      tap((response: SaveConfigResponse) => {
        if (response.success) {
          // Update the config subject with new values
          this.configSubject.next(config);
          
          // Handle redirect/refresh
          if (response.requiresRestart) {
            this.redirectToNewPort(response.newPort);
          } else {
            // Just refresh the page for PS3 config changes
            window.location.reload();
          }
        }
      })
    );
  }

  private redirectToNewPort(newPort: number): void {
    const url = window.location;
    const newUrl = `${url.protocol}//${url.hostname}:${newPort}${url.pathname}${url.search}${url.hash}`;
    
    // Brief delay to allow server restart
    setTimeout(() => {
      window.location.href = newUrl;
    }, 500);
  }
}
