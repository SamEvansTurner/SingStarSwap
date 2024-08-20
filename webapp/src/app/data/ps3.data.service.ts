import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class Ps3DataService {

  private gameDataXML = "http://${url}/dev_hdd0/xmlhost/game_plugin/mygames.xml";

  constructor() { }
}
