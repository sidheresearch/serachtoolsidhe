// app/components/ImporterChart.tsx
'use client';
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import { BarChart, DonutLarge } from '@mui/icons-material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ImporterData {
  true_importer_name: string;
  total_value_usd: number;
  total_shipments: number;
  city: string;
}

interface ImporterChartProps {
  data: ImporterData[];
  products_searched: string[];
}

export function ImporterChart({ data, products_searched }: ImporterChartProps) {
  const [chartType, setChartType] = React.useState<'bar' | 'doughnut'>('bar');

  // Prepare data for charts
  const chartData = data.slice(0, 10); // Top 10 importers
  
  const labels = chartData.map(item => {
    const name = item.true_importer_name || 'Unknown';
    return name.length > 25 ? `${name.substring(0, 25)}...` : name;
  });

  const values = chartData.map(item => item.total_value_usd || 0);
  const shipments = chartData.map(item => item.total_shipments || 0);

  // Color palette for charts
  const colors = [
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
  ];

  const barChartData = {
    labels,
    datasets: [
      {
        label: 'Total Value (USD)',
        data: values,
        backgroundColor: colors.map(color => `${color}80`), // 50% opacity
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Total Shipments',
        data: shipments,
        backgroundColor: colors.map(color => `${color}40`), // 25% opacity
        borderColor: colors.map(color => `${color}80`),
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
        yAxisID: 'y1',
      }
    ],
  };

  const doughnutChartData = {
    labels,
    datasets: [
      {
        label: 'Total Value (USD)',
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff',
        hoverOffset: 15, // This makes the segment move out on hover
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: '600',
          },
        },
      },
      title: {
        display: true,
        text: `Top Importers by Value - ${products_searched.join(', ')}`,
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#f59e0b',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Total Value (USD)') {
              return `${label}: $${value.toLocaleString()}`;
            } else {
              return `${label}: ${value.toLocaleString()} shipments`;
            }
          },
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex;
            const importer = chartData[dataIndex];
            return `City: ${importer.city || 'Unknown'}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Total Value (USD)',
          font: {
            size: 14,
            weight: '600',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Total Shipments',
          font: {
            size: 14,
            weight: '600',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'normal' as const,
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      title: {
        display: true,
        text: `Market Share - ${products_searched.join(', ')}`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#f59e0b',
        borderWidth: 2,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        boxPadding: 8,
        usePointStyle: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
          weight: 'normal' as const,
        },
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            const value = context.parsed;
            const total = values.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `Value: $${value.toLocaleString()} (${percentage}%)`;
          },
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex;
            const importer = chartData[dataIndex];
            return [
              `Shipments: ${importer.total_shipments?.toLocaleString() || 0}`,
              `City: ${importer.city || 'Unknown'}`
            ];
          }
        }
      },
    },
    onHover: (event: any, elements: any) => {
      // Change cursor to pointer when hovering over segments
      if (event.native && event.native.target) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    elements: {
      arc: {
        hoverBorderWidth: 6,
        hoverBorderColor: '#ffffff',
      }
    }
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No data available for chart
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        p: 4,
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.02) 0%, rgba(251, 191, 36, 0.02) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.1)',
      }}
    >
      {/* Chart Type Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          📊 Importer Analytics
        </Typography>
        
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, newType) => newType && setChartType(newType)}
          sx={{
            '& .MuiToggleButton-root': {
              border: '2px solid #f59e0b',
              color: '#f59e0b',
              '&.Mui-selected': {
                backgroundColor: '#f59e0b',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#e08a00',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
              },
            },
          }}
        >
          <ToggleButton value="bar">
            <BarChart sx={{ mr: 1 }} />
            Bar Chart
          </ToggleButton>
          <ToggleButton value="doughnut">
            <DonutLarge sx={{ mr: 1 }} />
            Doughnut
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Chart Container */}
      <Box sx={{ height: 500, width: '100%' }}>
        {chartType === 'bar' ? (
          <Bar data={barChartData} options={barChartOptions} />
        ) : (
          <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
        )}
      </Box>

      {/* Chart Summary */}
      <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          📈 Quick Stats
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Market Value</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#059669' }}>
              ${values.reduce((a, b) => a + b, 0).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Top Importer</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#f59e0b' }}>
              {chartData[0]?.true_importer_name?.substring(0, 20) || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Importers</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#3b82f6' }}>
              {data.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Avg Value per Importer</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#8b5cf6' }}>
              ${Math.round(values.reduce((a, b) => a + b, 0) / values.length).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}