import { Component, OnInit } from '@angular/core';
import { PS2DataService } from '../data/ps2.data.service';


export interface PS2GameData {
  name: string,
  mountUrl: string,
  imageUrl?: string
}

@Component({
  selector: 'app-gamecards',
  standalone: true,
  imports: [],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {
  data: Map<string, PS2GameData>  = new Map<string, PS2GameData>();
  isoMountURL = "";

  constructor(private dataService: PS2DataService) { }

  private getGameID() {

  }

  private processSingStarGameFolderData(data: string) {
    var domParser = new DOMParser();
    var htmlElement = domParser.parseFromString(data, 'text/html');
    var tableObject = htmlElement.querySelector("table[id=files]")
    var dirs = tableObject?.querySelectorAll("a[class=d]")
    dirs?.forEach((item, iterator) => {
      if (item.innerHTML.toLowerCase().includes(this.dataService.folderFilter.toLowerCase())) {
        var cols = item.parentElement?.parentElement?.querySelectorAll("td")
        var keyRef = cols?.item(0).querySelector("a")?.getAttribute("href") as string
        var key = this.dataService.apiUrl + "/" + keyRef
        var mountLinkRef = cols?.item(1).querySelector("a")?.getAttribute("href") as string
        var mountLink = this.dataService.toUrl(mountLinkRef)
        if (key && mountLink) {
          this.data.set(key, {
            name: item.innerHTML + '\n',
            mountUrl: encodeURI(mountLink.replace("mount.ps3", "mount.ps2"))
          })
        }
        this.getGameID()
      }
    }
    )
  } 

  ngOnInit(): void {
    var singStarGameData = this.dataService.getSingStarGameData()
    singStarGameData.subscribe(
      {
        next: this.processSingStarGameFolderData.bind(this)
      }
    )
    var ps2ISOMountPath = this.dataService.getPS2ISOMountURL()
    ps2ISOMountPath.subscribe(
      {
        next: (response) => {if(response) {this.isoMountURL = response};}
      }
    )
  }

  handleClick(item: any) {
    console.log(this.data.get(item)?.name)
    console.log(this.data.get(item)?.mountUrl)
  }
}
