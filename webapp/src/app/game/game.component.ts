import { Component, OnInit } from '@angular/core';
import { PS2DataService } from '../data/ps2.data.service';
import { PS3DataService } from '../data/ps3.data.service';
import { GameData } from '../data/game-data.model';


@Component({
  selector: 'app-gamecards',
  standalone: true,
  imports: [],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {
  data: Array<GameData> = new Array<GameData>();
  isoMountURL = "";

  constructor(private ps2DataService: PS2DataService, private ps3DataService: PS3DataService) { }

  ngOnInit(): void {
    var ps2GameData = this.ps2DataService.getSingStarGameData()
    ps2GameData.subscribe(
      {
        next: (item) => {this.data.push(item)}
      }
    )
    var ps3GameData = this.ps3DataService.getSingStarGameData()
    ps3GameData.subscribe(
      {
        next: (item) => {this.data.push(item)}
      }
    )
  
  }

  handleClick(item: any) {
    console.log(this.data[item]?.name)
    console.log(this.data[item]?.mountUrl)
    console.log(this.data[item]?.gameSerial ?? '')
  }
}


/*
1.Create a directory on internal/external and extract/copy the loose Singstar files to it.
Example: "dev_usb001/Singstar/SingStar Pop/Pack_EE.PAK" etc.
2. Load up any PS3 SingStar game
3. In the song selection, press SELECT to open the change disc dialogue
4. Eject your disc if there's one inside the PS3
5. Now if you want to load the SingStar Pop from above, you should use this command:
http://192.168.178.xx/mount_ps2/dev_usb001/Singstar/SingStar+Pop​
6. Then insert any PS2 disc. It should automatically load the mounted SingStar game.
*/