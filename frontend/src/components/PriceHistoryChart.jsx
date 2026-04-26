import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Shows how the lowest bid (L1 price) dropped over time.
// Each point is the moment a new lowest bid was submitted.
// This makes the "competition getting intense" story visual.
export default function PriceHistoryChart({ bids }) {
  const chartData = useMemo(() => {
    if (!bids || bids.length === 0) return null;

    // Sort bids by submission time
    const sorted = [...bids].sort(
      (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)
    );

    // Track the running lowest price — one point per bid
    let lowestSoFar = Infinity;
    const points = [];
    for (const bid of sorted) {
      const price = parseFloat(bid.total_charges);
      if (price < lowestSoFar) lowestSoFar = price;
      points.push({
        x: new Date(bid.submitted_at).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
        y: lowestSoFar,
      });
    }

    return {
      labels: points.map(p => p.x),
      datasets: [{
        label: 'Lowest bid (L1)',
        data: points.map(p => p.y),
        fill: true,
        tension: 0.3,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#2563eb',
        borderWidth: 2,
      }],
    };
  }, [bids]);

  if (!chartData || chartData.labels.length < 2) {
    return (
      <div style={styles.empty}>
        Chart appears once 2+ bids are submitted
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `₹${new Intl.NumberFormat('en-IN').format(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (v) => '₹' + new Intl.NumberFormat('en-IN').format(v),
        },
      },
    },
  };

  return (
    <div style={styles.wrapper}>
      <Line data={chartData} options={options} />
    </div>
  );
}

const styles = {
  wrapper: { height: 200, padding: '8px 0' },
  empty: {
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: 13,
  },
};
