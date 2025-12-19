import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-letter-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-navigation.component.html',
  styleUrls: ['./letter-navigation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LetterNavigationComponent {
  @Input() letters: string[] = [];
  @Input() showSettingsButton: boolean = true;

  @Output() letterClick = new EventEmitter<string>();
  @Output() settingsClick = new EventEmitter<void>();

  onLetterClick(letter: string): void {
    this.letterClick.emit(letter);
  }

  onSettingsClick(): void {
    this.settingsClick.emit();
  }

  trackByLetter(index: number, letter: string): string {
    return letter;
  }
}
