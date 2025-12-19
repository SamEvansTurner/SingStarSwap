import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-song-filters',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatSlideToggleModule
  ],
  templateUrl: './song-filters.component.html',
  styleUrls: ['./song-filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongFiltersComponent {
  @Input() sortBy: 'artist' | 'title' = 'artist';
  @Input() showAvailableOnly: boolean = true;

  @Output() sortChange = new EventEmitter<'artist' | 'title'>();
  @Output() filterChange = new EventEmitter<boolean>();

  onSortChange(value: 'artist' | 'title'): void {
    this.sortChange.emit(value);
  }

  onFilterChange(checked: boolean): void {
    this.filterChange.emit(checked);
  }
}
