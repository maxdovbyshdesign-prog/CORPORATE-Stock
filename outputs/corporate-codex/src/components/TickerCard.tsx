import type { CSSProperties } from "react";
import type { MarketPoint } from "../App";
import type { MarketInstrument, MarketInstrumentId } from "../data/entities";
import { formatCappedPercent, isAbnormalMarketStatus, safePercentChange } from "../lib/marketModel";
import { MiniChart } from "./MiniChart";

type TickerCardProps = {
  instrument: MarketInstrument;
  point: MarketPoint;
  onSelect: (id: MarketInstrumentId) => void;
};

export function TickerCard({ instrument, point, onSelect }: TickerCardProps) {
  const change = point.value - point.previousClose;
  const percent = safePercentChange(point.value, point.previousClose, instrument.id, instrument.basePrice);
  const positive = change >= 0;
  const statusLabel = point.marketStatus === "HALTED" ? "HALTED" : point.marketStatus;
  const movementLabel = isAbnormalMarketStatus(point.marketStatus) ? statusLabel : formatCappedPercent(percent);

  return (
    <button
      className="ticker-row-card"
      onClick={() => onSelect(instrument.id)}
      style={{ "--instrument-color": instrument.accentColor } as CSSProperties}
    >
      <strong className="instrument-symbol" title={instrument.id}>
        <i />
        {instrument.symbol}
      </strong>
      <span className="instrument-name">{instrument.fullName}</span>
      <small>{instrument.category === "index" ? "Index" : instrument.type}</small>
      <b>{point.value.toFixed(2)}</b>
      <em className={positive ? "positive" : "negative"} title={isAbnormalMarketStatus(point.marketStatus) ? formatCappedPercent(percent) : undefined}>
        {movementLabel}
      </em>
      <MiniChart history={point.history.slice(-32).map((item) => item.value)} positive={positive} height={34} />
      <p>{point.headline}</p>
    </button>
  );
}
