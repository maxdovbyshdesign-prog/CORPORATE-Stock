import { useMemo, useState } from "react";
import type { MarketHistoryPoint } from "../lib/marketModel";
import type { MarketEvent } from "../data/events";

type MarketChartProps = {
  history: MarketHistoryPoint[];
  events: MarketEvent[];
  positive: boolean;
  selectedPoint?: MarketHistoryPoint;
  onSelectPoint: (point: MarketHistoryPoint) => void;
};

const formatPrice = (value: number) => value.toFixed(value > 100 ? 0 : 2);
const pointKey = (point: MarketHistoryPoint) => `${point.entityId}-${point.timestamp}`;

export function MarketChart({ history, events, positive, selectedPoint, onSelectPoint }: MarketChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<MarketHistoryPoint | null>(null);
  const width = 980;
  const height = 420;
  const chartTop = 24;
  const chartBottom = 328;
  const volumeBottom = 398;
  const visible = history.slice(-64);
  const values = visible.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const candleGap = width / visible.length;
  const candleWidth = Math.max(4, candleGap * 0.48);
  const priceToY = (price: number) => chartBottom - ((price - min) / span) * (chartBottom - chartTop);
  const last = visible[visible.length - 1];
  const lastY = priceToY(last.value);
  const gridValues = Array.from({ length: 6 }, (_, index) => max - (span / 5) * index);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const candles = visible.map((point, index) => {
    const close = point.value;
    const open = index === 0 ? point.previousValue : visible[index - 1].value;
    const direction = close >= open;
    const wickSeed = Math.abs(Math.sin((index + close) * 0.37));
    const high = Math.max(open, close) + span * (0.018 + wickSeed * 0.028);
    const low = Math.min(open, close) - span * (0.018 + (1 - wickSeed) * 0.025);
    const x = 18 + index * candleGap;
    const openY = priceToY(open);
    const closeY = priceToY(close);
    const highY = priceToY(high);
    const lowY = priceToY(low);
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(3, Math.abs(openY - closeY));
    const volumeHeight = Math.min(50, (point.simulatedVolume / 9000) * 34 + Math.abs(point.percentChange) * 2);

    return {
      point,
      x,
      direction,
      highY,
      lowY,
      bodyY,
      bodyHeight,
      volumeHeight,
      selected: selectedPoint ? pointKey(selectedPoint) === pointKey(point) : false,
    };
  });

  const hoveredEvent = hoveredPoint?.eventIds.map((id) => eventById.get(id)).find(Boolean);
  const hoveredX = hoveredPoint ? candles.find((candle) => pointKey(candle.point) === pointKey(hoveredPoint))?.x ?? 0 : 0;
  const hoveredY = hoveredPoint ? priceToY(hoveredPoint.value) : 0;

  return (
    <div className="market-chart-wrap" onMouseLeave={() => setHoveredPoint(null)}>
      <svg className="market-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live candlestick chart">
        <defs>
          <linearGradient id={`terminal-fill-${positive ? "up" : "down"}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={positive ? "#3ba36f" : "#a8504e"} stopOpacity="0.28" />
            <stop offset="100%" stopColor={positive ? "#3ba36f" : "#a8504e"} stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect className="chart-bg" x="0" y="0" width={width} height={height} rx="4" />

        {Array.from({ length: 11 }, (_, index) => {
          const x = 18 + index * ((width - 82) / 10);
          return <line className="terminal-gridline vertical" key={`v-${index}`} x1={x} x2={x} y1={chartTop} y2={volumeBottom} />;
        })}

        {gridValues.map((value) => {
          const y = priceToY(value);
          return (
            <g key={value}>
              <line className="terminal-gridline" x1="18" x2={width - 56} y1={y} y2={y} />
              <text className="axis-label" x={width - 48} y={y + 4}>{formatPrice(value)}</text>
            </g>
          );
        })}

        <path
          className="area-fill"
          d={[
            `M ${candles[0].x} ${priceToY(visible[0].value)}`,
            ...visible.map((point, index) => `L ${18 + index * candleGap} ${priceToY(point.value)}`),
            `L ${18 + (visible.length - 1) * candleGap} ${chartBottom}`,
            `L ${candles[0].x} ${chartBottom}`,
            "Z",
          ].join(" ")}
          fill={`url(#terminal-fill-${positive ? "up" : "down"})`}
        />

        {candles.map((candle) => (
          <g className={candle.selected ? "candle-group selected" : "candle-group"} key={pointKey(candle.point)}>
            <line
              className={candle.direction ? "candle-up" : "candle-down"}
              x1={candle.x}
              x2={candle.x}
              y1={candle.highY}
              y2={candle.lowY}
            />
            <rect
              className={candle.direction ? "candle-up" : "candle-down"}
              x={candle.x - candleWidth / 2}
              y={candle.bodyY}
              width={candleWidth}
              height={candle.bodyHeight}
              rx="1"
            />
            <rect
              className={candle.direction ? "volume-up" : "volume-down"}
              x={candle.x - candleWidth / 2}
              y={volumeBottom - candle.volumeHeight}
              width={candleWidth}
              height={candle.volumeHeight}
            />
            <rect
              className="candle-hitbox"
              x={candle.x - candleGap / 2}
              y={chartTop}
              width={candleGap}
              height={volumeBottom - chartTop}
              onClick={() => onSelectPoint(candle.point)}
              onFocus={() => setHoveredPoint(candle.point)}
              onMouseEnter={() => setHoveredPoint(candle.point)}
              tabIndex={0}
            />
          </g>
        ))}

        <line className="last-price-line" x1="18" x2={width - 56} y1={lastY} y2={lastY} />
        <rect className={positive ? "price-marker positive-marker" : "price-marker negative-marker"} x={width - 54} y={lastY - 12} width="54" height="22" rx="3" />
        <text className="price-marker-text" x={width - 48} y={lastY + 4}>{last.value.toFixed(2)}</text>
        <text className="time-label" x="18" y="414">09:30</text>
        <text className="time-label" x={width / 2 - 22} y="414">ACTIVE WINDOW</text>
        <text className="time-label" x={width - 106} y="414">LIVE SIM</text>
      </svg>

      {hoveredPoint ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${Math.min(84, Math.max(8, (hoveredX / width) * 100))}%`,
            top: `${Math.min(70, Math.max(8, (hoveredY / height) * 100))}%`,
          }}
        >
          <time>{new Date(hoveredPoint.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
          <strong>{hoveredPoint.value.toFixed(2)}</strong>
          <span>
            {hoveredPoint.delta >= 0 ? "+" : ""}
            {hoveredPoint.delta.toFixed(2)} / {hoveredPoint.percentChange >= 0 ? "+" : ""}
            {hoveredPoint.percentChange.toFixed(2)}%
          </span>
          <p>{hoveredEvent?.headline ?? hoveredPoint.note}</p>
          {hoveredEvent ? <small>{hoveredEvent.category} / {hoveredEvent.tags.slice(0, 3).join(", ")}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
