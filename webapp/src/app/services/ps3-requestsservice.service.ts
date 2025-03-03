import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { concatMap, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PS3RequestService {

    private requestQueue$ = new BehaviorSubject<{ url: string, subject: BehaviorSubject<any> } | null>(null);  // Queue for URL and subject

    constructor(private http: HttpClient) {
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
          ).subscribe(); 
    }

    // Method to enqueue a request and return the subject to the component
    makeRequest(url: string): Observable<any> {
      const responseSubject = new BehaviorSubject<any>(null);  // Create a new subject for this request
  
      // Add the request URL and subject to the queue for sequential processing
      this.requestQueue$.next({ url, subject: responseSubject });
  
      // Return the subject's observable to the component to subscribe to
      return responseSubject.asObservable();
    }
  
    // Send the HTTP request and return the observable
    private sendRequest(url: string): Observable<any> {
      return this.http.get(url, {responseType: 'text'});  // No error handling here; let the error propagate naturally
    }

}