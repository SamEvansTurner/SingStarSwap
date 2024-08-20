import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GameComponent } from './game/game.component';
import { SongsearchComponent } from './songsearch/songsearch.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent, SongsearchComponent, MatTabsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'webapp';
}
