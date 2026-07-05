import type { CSSProperties } from "react";
import { marketInstruments, type MarketInstrumentId } from "../data/entities";
import type { MarketEvent } from "../data/events";

type EventImpactChipsProps = {
  event: MarketEvent;
  onSelectInstrument?: (id: MarketInstrumentId) => void;
};

const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export function EventImpactChips({ event, onSelectInstrument }: EventImpactChipsProps) {
  const impacts = Object.entries(event.impacts)
    .map(([id, impact]) => {
      const instrument = marketInstruments.find((item) => item.id === id);
      return instrument && impact !== undefined ? { instrument, impact } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!impacts.length) {
    return null;
  }

  return (
    <div className="impact-chip-list" aria-label="Market impacts">
      {impacts.map(({ instrument, impact }) => (
        <button
          className={impact >= 0 ? "impact-chip positive-impact" : "impact-chip negative-impact"}
          key={instrument.id}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            onSelectInstrument?.(instrument.id);
          }}
          style={{ "--instrument-color": instrument.accentColor } as CSSProperties}
          title={instrument.fullName}
          type="button"
        >
          <i />
          {instrument.symbol} {formatSigned(impact)}
        </button>
      ))}
    </div>
  );
}
