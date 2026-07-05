type MiniChartProps = {
  history: number[];
  positive: boolean;
  height?: number;
};

export function MiniChart({ history, positive, height = 48 }: MiniChartProps) {
  const width = 160;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const points = history
    .map((value, index) => {
      const x = (index / Math.max(history.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent price movement">
      <polyline className={positive ? "line-positive" : "line-negative"} points={points} fill="none" strokeWidth="2" />
      <line className="chart-baseline" x1="0" x2={width} y1={height - 4} y2={height - 4} />
    </svg>
  );
}
