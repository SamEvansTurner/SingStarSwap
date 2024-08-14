import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';import { BehaviorSubject, firstValueFrom, Observable, of, tap } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class PS2DataService {
  private apiUrl = "";
  private dataSubject = new BehaviorSubject<string | null>(null);
  private data$ = this.dataSubject.asObservable();
  public folderFilter = "";

  constructor(private http: HttpClient, private configService: ConfigService) { 
    configService.config$.subscribe(
      data => {
        if (data) {
          this.apiUrl = "http://" + data?.address + "" + data?.ps2path;
          this.folderFilter = data?.ps2folderfilter;
          this.http.get(this.apiUrl, {responseType: 'text'}).subscribe(
            { 
              next: (response) => {
                this.dataSubject.next(response)
              },
              error: (err) => {
                //FOR DEBUGGING: just set default values
                console.error("error in ps2dataservice: ", err);
              }
            }
          );
        }
      }
    )
  }

  getData(): Observable<string | null> {
    if (this.dataSubject.value) {
      return of(this.dataSubject.value);
    } else {
      return this.data$;
    }
  }
}