import { Component, OnInit } from '@angular/core';
import { GameData } from '../../data/game-data.model';
import { GamesDataService } from '../../services/games.data.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-gamecards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {

  games$! : Observable<Array<GameData>>;

  constructor(protected gamesDataService: GamesDataService ) { }

  ngOnInit(): void {
    this.games$ = this.gamesDataService.gameData$;
  }

  handleClick(item: GameData) {
    console.log(item.name)
    console.log(item.mountUrl)
    console.log(item.gameSerial ?? '')
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