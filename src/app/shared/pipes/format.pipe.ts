import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDuration',
  standalone: true
})
export class FormatDurationPipe implements PipeTransform {
  transform(segundos: number): string {
    if (!segundos || segundos < 0) return '0:00';
    
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    
    if (mins === 0) {
      return `0:${secs.toString().padStart(2, '0')}`;
    }
    
    if (mins >= 60) {
      const horas = Math.floor(mins / 60);
      const minRest = mins % 60;
      return `${horas}:${minRest.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}