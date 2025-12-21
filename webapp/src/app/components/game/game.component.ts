import { Component, OnInit } from '@angular/core';
import { GameData } from '../../data/game-data.model';
import { GamesDataService } from '../../services/games.data.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { PS3RequestService } from '../../services/ps3-requestsservice.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-gamecards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {

  games$! : Observable<Array<GameData>>;
  failedImages = new Set<string>();

  constructor(protected gamesDataService: GamesDataService, private ps3RequestService : PS3RequestService ) { }

  ngOnInit(): void {
    this.games$ = this.gamesDataService.gameData$;
  }

  handleClick(item: GameData) {
    this.ps3RequestService.loadDisc(item)
  }

  onImageError(imageUrl: string | undefined) {
    if (imageUrl) {
      this.failedImages.add(imageUrl);
    }
  }

  hasImageFailed(imageUrl: string | undefined): boolean {
    return imageUrl ? this.failedImages.has(imageUrl) : true;
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
