import type { CSSProperties } from "react";
import type { MarketState } from "../App";
import { marketInstruments, type MarketInstrumentId } from "../data/entities";
import type { MarketEvent } from "../data/events";
import { formatCappedPercent, isAbnormalMarketStatus, safePercentChange } from "../lib/marketModel";
import { EventImpactChips } from "./EventImpactChips";
import { TickerCard } from "./TickerCard";

type MarketDashboardProps = {
  market: MarketState;
  recentEvents: MarketEvent[];
  onSelect: (id: MarketInstrumentId) => void;
};

export function MarketDashboard({ market, recentEvents, onSelect }: MarketDashboardProps) {
  const movers = marketInstruments
    .map((instrument) => {
      const point = market[instrument.id];
      const change = safePercentChange(point.value, point.previousClose, instrument.id, instrument.basePrice);
      return { instrument, point, change };
    })
    .filter(({ point }) => !isAbnormalMarketStatus(point.marketStatus))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3);

  return (
    <section className="dashboard-panel overview-dashboard" aria-label="Market overview">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Proxima Exposure</p>
          <h2>Market Overview</h2>
        </div>
        <span>WATCH ALL</span>
      </div>

      <div className="overview-summary">
        <div>
          <span>Tradable instruments</span>
          <strong>{marketInstruments.length}</strong>
        </div>
        <div>
          <span>Latest material event</span>
          <strong>{recentEvents[0]?.severity.toUpperCase() ?? "NONE"}</strong>
        </div>
        <div>
          <span>Top movers</span>
          <div className="mover-list">
            {movers.length ? (
              movers.map(({ instrument, change }) => (
                <button
                  key={instrument.id}
                  onClick={() => onSelect(instrument.id)}
                  style={{ "--instrument-color": instrument.accentColor } as CSSProperties}
                  title={instrument.fullName}
                  type="button"
                >
                  <i />
                  {instrument.symbol} {formatCappedPercent(change)}
                </button>
              ))
            ) : (
              <span className="mover-empty">MARKET REVIEW</span>
            )}
          </div>
        </div>
      </div>

      <div className="overview-layout">
        <div className="watch-all-panel">
          <div className="watch-all-header">
            <span>Symbol</span>
            <span>Name</span>
            <span>Type</span>
            <span>Last</span>
            <span>Chg%</span>
            <span>Trend</span>
          </div>
          <div className="watch-all-list">
            {marketInstruments.map((instrument) => (
              <TickerCard
                key={instrument.id}
                instrument={instrument}
                point={market[instrument.id]}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <aside className="event-explain-panel" aria-label="Recent event explanations">
          <div className="watchlist-header">
            <strong>Event → Market</strong>
            <span>Recent</span>
          </div>
          {recentEvents.slice(0, 5).map((event) => (
            <article className={`event-note ${event.severity}`} key={event.id}>
              <span>{event.source ?? event.category}{event.generated ? " / LIVE" : ""}</span>
              <h3>{event.headline}</h3>
              <p>{event.summary}</p>
              <EventImpactChips event={event} onSelectInstrument={onSelect} />
            </article>
          ))}
        </aside>
      </div>
    </section>
  );
}
