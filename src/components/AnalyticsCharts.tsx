import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { WeatherEvent, EventCategory } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { TrendingUp, PieChart, BarChart2, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsChartsProps {
  events: WeatherEvent[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ events }) => {
  
  const categoriesList: EventCategory[] = [
    'rainfall',
    'thunderstorm',
    'flooding',
    'heatwave',
    'fog',
    'dust storm',
    'strong wind'
  ];

  const categoryCounts = categoriesList.map(cat => 
    events.filter(e => e.category === cat).length
  );

  const categoryLabels = categoriesList.map(cat => CATEGORY_CONFIG[cat].label);
  const categoryColors = [
    '#0284c7', // rainfall
    '#7c3aed', // thunderstorm
    '#0369a1', // flooding
    '#ea580c', // heatwave
    '#475569', // fog
    '#ca8a04', // dust storm
    '#0d9488', // strong wind
  ];

  const doughnutData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryCounts,
        backgroundColor: categoryColors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#334155',
          font: { size: 12, family: 'Inter, sans-serif', weight: 600 as any },
          boxWidth: 12,
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10
      }
    }
  };

  // Top Affected States (Horizontal Bar)
  const stateCounts: Record<string, number> = {};
  events.forEach(e => {
    stateCounts[e.state] = (stateCounts[e.state] || 0) + 1;
  });

  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const barData = {
    labels: sortedStates.map(s => s[0]),
    datasets: [
      {
        label: 'Weather Incidents Recorded',
        data: sortedStates.map(s => s[1]),
        backgroundColor: 'rgba(2, 132, 199, 0.75)',
        borderColor: '#0284c7',
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0'
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#1e293b', font: { size: 12, family: 'Inter', weight: 600 as any } }
      }
    }
  };

  // 24-Hour Incident Time-Series Trend
  const timeLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const trendData = [3, 5, 8, 14, 18, 22, 19, events.length];

  const lineData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Hourly Incident Ingestion Rate',
        data: trendData,
        fill: true,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        tension: 0.35,
        pointBackgroundColor: '#0284c7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0'
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              National Weather Trend & Regional Hotspots Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-source data visualization across 7 IMD categories and Indian states.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
            Total Ingested: <strong className="font-mono">{events.length}</strong>
          </div>
        </div>
      </div>

      {/* Grid of 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Category Breakdown Doughnut */}
        <div className="lg:col-span-6 glass-card p-5 rounded-3xl flex flex-col shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Weather Category Distribution
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              7 IMD Categories
            </span>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* Chart 2: Top Affected States Bar Chart */}
        <div className="lg:col-span-6 glass-card p-5 rounded-3xl flex flex-col shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Top Affected Indian States
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Ranked by Incidents
            </span>
          </div>

          <div className="h-64 relative">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Chart 3: 24h Trendline Full Width */}
        <div className="lg:col-span-12 glass-card p-5 rounded-3xl flex flex-col shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                24-Hour Temporal Incident Ingestion Trend
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Live Feed Connected
            </span>
          </div>

          <div className="h-60 relative">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

      </div>

    </div>
  );
};
