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
  @Input() entregas: any[] = [];
  @Input() tipoUsuario: string = '';
  @Input() usuarioIdLogado: string = '';
  @Input() usuariosFilhos: any[] = [];
  @Input() dataInicio!: string;
  @Input() dataFim!: string;


  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: []
  };

  ngOnChanges(): void {
    const eventos = (this.sprints?.length ? this.sprints : this.entregas) || [];
  
    const eventosFiltrados =
      this.tipoUsuario === 'adm'
        ? eventos
        : eventos.filter(e => e.usuarioId?._id === this.usuarioIdLogado);
  
    this.calendarOptions = {
      ...this.calendarOptions,
      events: eventosFiltrados.map(e => ({
        title:
          this.tipoUsuario === 'adm'
            ? `${e.titulo} (${e.usuarioId?.nome || 'Usuário'})`
            : e.titulo,
        date: e.dataPrevista,
        color: this.tipoUsuario === 'adm' ? '#007bff' : '#28a745'
      })),
      validRange: {
        start: this.dataInicio,
        end: this.dataFim
      },
      visibleRange: {
        start: this.dataInicio,
        end: this.dataFim
      },
      initialDate: this.dataInicio // para começar o calendário já no mês correto
    };
  }
  
}
