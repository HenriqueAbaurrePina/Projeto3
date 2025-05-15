import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-sprint-curva-s',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './curva-s-sprint.component.html'
})
export class SprintCurvaSComponent implements OnChanges {
  @Input() sprints!: any[];
  @Input() curvaS: any[] = [];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  ngOnChanges(): void {
    const labels = this.curvaS.map(p => p.data);
    const previstas = this.curvaS.map(p => p.previstasAcumuladas);
    const realizadas = this.curvaS.map(p => p.realizadasAcumuladas);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Previstas',
          data: previstas,
          borderColor: '#f0ad4e',
          fill: false,
          tension: 0.2
        },
        {
          label: 'Realizadas',
          data: realizadas,
          borderColor: '#5cb85c',
          fill: false,
          tension: 0.2
        }
      ]
    };
  }

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    }
  };

  chartType: 'line' = 'line';
}
