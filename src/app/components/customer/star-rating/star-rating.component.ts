import { Component, signal, output, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  // Input properties
  rating = input<number>(0);
  maxStars = input<number>(5);
  readonly = input<boolean>(false);
  size = input<'small' | 'medium' | 'large'>('medium');

  // Output events
  ratingChange = output<number>();

  // Local state
  hoveredStar = signal<number>(0);

  onStarClick(star: number): void {
    if (!this.readonly()) {
      this.ratingChange.emit(star);
    }
  }

  onStarHover(star: number): void {
    if (!this.readonly()) {
      this.hoveredStar.set(star);
    }
  }

  onMouseLeave(): void {
    this.hoveredStar.set(0);
  }

  getStarIcon(star: number): string {
    const currentRating = this.hoveredStar() || this.rating();
    if (star <= currentRating) {
      return 'star';
    } else if (star - 0.5 === currentRating) {
      return 'star_half';
    } else {
      return 'star_border';
    }
  }

  getStarClass(star: number): string {
    const currentRating = this.hoveredStar() || this.rating();
    return star <= currentRating ? 'filled' : 'empty';
  }

  get stars(): number[] {
    return Array.from({ length: this.maxStars() }, (_, i) => i + 1);
  }
}

