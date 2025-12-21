import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable, tap, timer, throwError } from 'rxjs';
import { retry, timeout, catchError } from 'rxjs/operators';
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
    this.http.get(`${this.location.path(false)}/api/config`, {responseType: 'json'}).pipe(
      timeout(5000), // 5 second timeout for config loading
      retry({
        count: 2, // Retry up to 2 times (3 total attempts)
        delay: (error, retryCount) => {
          console.log(`Config load failed, retry attempt ${retryCount}...`);
          return timer(1000 * retryCount); // 1s, 2s backoff
        }
      })
    ).subscribe(
        { 
          next: (response) => {
            this.configSubject.next(response as Config);
            this.configLoadedFromServerSubject.next(true);
          },
        error: (err) => {
            // Development fallback: When running with `ng serve` without backend server,
            // use default configuration for local development and testing.
            // This allows the frontend to be developed independently of the backend.
            console.warn('Failed to load configuration from server, using development defaults:', err);
            
            this.configSubject.next({
              server: {
                port: 4200
              },
              PS3: {
                address: "192.168.21.30",
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
      timeout(5000), // 5 second timeout for config save
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
      }),
      catchError(error => {
        console.error('Failed to save configuration:', error);
        return throwError(() => error);
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
