import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';

@Component({
  selector: 'app-sprint-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './sprint-calendar.component.html'
})
export class SprintCalendarComponent implements OnChanges {
  @Input() sprints: any[] = [];

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: []
  };

  ngOnChanges(): void {
    if (!Array.isArray(this.sprints)) return;

    const events = this.sprints.flatMap(sprint => {
      const sprintId = sprint._id;
      const baseTitle = sprint.nome;

      const baseEvents = [
        {
          title: `🟢 Início: ${baseTitle}`,
          date: sprint.dataInicio,
          color: '#28a745',
          allDay: true
        },
        {
          title: `🔴 Fim: ${baseTitle}`,
          date: sprint.dataFim,
          color: '#dc3545',
          allDay: true
        }
      ];

      if (sprint.dataConclusao) {
        baseEvents.push({
          title: `✅ Concluída: ${baseTitle}`,
          date: sprint.dataConclusao,
          color: '#007bff',
          allDay: true
        });
      }

      return baseEvents;
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events
    };
  }
}
