import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-curva-s',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './curva-s.component.html'
})
export class CurvaSComponent implements OnChanges {
  @Input() entregas: any[] = [];
  @Input() tipoUsuario: string = '';
  @Input() usuariosFilhos: any[] = [];
  @Input() dataInicioProjeto!: string;
  @Input() dataFimProjeto!: string;

  public chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Curva S - Projeto' }
    },
    scales: {
      x: { title: { display: true, text: 'Data' } },
      y: {
        title: { display: true, text: '% Concluído' },
        min: 0,
        max: 100,
        ticks: {
          stepSize: 10
        }
      }
    }
  };

  public tabelaDatas: string[] = [];
  public tabelaPlanejado: number[] = [];
  public tabelaRealizado: number[] = [];

  ngOnChanges(): void {
    if (this.entregas.length > 0 && this.dataInicioProjeto && this.dataFimProjeto) {
      this.gerarCurvaS();
    }
  }

  gerarCurvaS() {
    const todasEntregas = this.entregas;
    const datas: string[] = [];
    const planejado: number[] = [];
    const realizado: number[] = [];
    const total = todasEntregas.length;

    if (total === 0) {
      this.chartData = { labels: [], datasets: [] };
      this.tabelaDatas = [];
      this.tabelaPlanejado = [];
      this.tabelaRealizado = [];
      return;
    }

    const dataInicio = new Date(this.dataInicioProjeto);
    const dataFim = new Date(this.dataFimProjeto);

    const datasUnicas: string[] = [];
    for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
      datasUnicas.push(new Date(d).toISOString().split('T')[0]);
    }

    let acumuladoPlanejado = 0;
    let acumuladoRealizado = 0;

    datasUnicas.forEach((dataStr) => {
      const planejadasDia = todasEntregas.filter(e => new Date(e.dataPrevista).toISOString().split('T')[0] === dataStr).length;
      const entreguesAteDia = todasEntregas.filter(e => e.dataEntregue && new Date(e.dataEntregue).toISOString().split('T')[0] <= dataStr).length;

      acumuladoPlanejado += planejadasDia;
      acumuladoRealizado = entreguesAteDia;

      datas.push(dataStr);
      planejado.push((acumuladoPlanejado / total) * 100);
      realizado.push((acumuladoRealizado / total) * 100);
    });

    const datasets: any[] = [
      {
        label: 'Planejado (Projeto)',
        data: planejado,
        borderColor: 'blue',
        fill: false
      },
      {
        label: 'Realizado (Projeto)',
        data: realizado,
        borderColor: 'green',
        fill: false
      }
    ];

    if (this.tipoUsuario === 'adm') {
      for (const usuario of this.usuariosFilhos) {
        const entregasUsuario = todasEntregas.filter(e => e.usuarioId?._id === usuario._id);
        let acumuladoPlanejadoUsuario = 0;
        let acumuladoRealizadoUsuario = 0;
        const planejadoUsuario: number[] = [];
        const realizadoUsuario: number[] = [];

        datasUnicas.forEach((dataStr) => {
          const planejadasUsuarioDia = entregasUsuario.filter(e => new Date(e.dataPrevista).toISOString().split('T')[0] === dataStr).length;
          const entreguesUsuarioAteDia = entregasUsuario.filter(e => e.dataEntregue && new Date(e.dataEntregue).toISOString().split('T')[0] <= dataStr).length;

          acumuladoPlanejadoUsuario += planejadasUsuarioDia;
          acumuladoRealizadoUsuario = entreguesUsuarioAteDia;

          planejadoUsuario.push(entregasUsuario.length ? (acumuladoPlanejadoUsuario / entregasUsuario.length) * 100 : 0);
          realizadoUsuario.push(entregasUsuario.length ? (acumuladoRealizadoUsuario / entregasUsuario.length) * 100 : 0);
        });

        datasets.push(
          {
            label: `Planejado (${usuario.nome})`,
            data: planejadoUsuario,
            borderColor: 'orange',
            borderDash: [5, 5],
            fill: false
          },
          {
            label: `Realizado (${usuario.nome})`,
            data: realizadoUsuario,
            borderColor: 'purple',
            borderDash: [5, 5],
            fill: false
          }
        );
      }
    }

    this.chartData = {
      labels: datas,
      datasets
    };

    this.tabelaDatas = datas;
    this.tabelaPlanejado = planejado;
    this.tabelaRealizado = realizado;
  }
}
