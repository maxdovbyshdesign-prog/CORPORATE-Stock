import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { MarketPoint } from "../App";
import { excerptFor, getDocument, type CodexDocumentId } from "../data/documents";
import type { MarketInstrument, MarketInstrumentId } from "../data/entities";
import type { InstitutionImpact, MarketEvent } from "../data/events";
import {
  explainRecentMove,
  formatCappedPercent,
  humanSystemsProfiles,
  isAbnormalMarketStatus,
  safePercentChange,
  type MarketHistoryPoint,
} from "../lib/marketModel";
import { EventImpactChips } from "./EventImpactChips";
import { MarketChart } from "./MarketChart";

type MarketDetailProps = {
  instrument: MarketInstrument;
  point: MarketPoint;
  recentEvents: MarketEvent[];
  onBack: () => void;
  onOpenDocument: (documentId: CodexDocumentId, section?: string) => void;
  onSelectInstrument: (id: MarketInstrumentId) => void;
};

const movementClass = (value: number) => (value >= 0 ? "positive" : "negative");
const formatImpact = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const formatDelta = (value = 0) => `${value >= 0 ? "+" : ""}${value}`;

const institutionImpactSummary = (impact: InstitutionImpact) =>
  Object.entries(impact)
    .map(([key, value]) => `${key}: ${typeof value === "number" ? `${value >= 0 ? "+" : ""}${value}` : value}`)
    .join(", ");

export function MarketDetail({
  instrument,
  point,
  recentEvents,
  onBack,
  onOpenDocument,
  onSelectInstrument,
}: MarketDetailProps) {
  const change = point.value - point.previousClose;
  const percent = safePercentChange(point.value, point.previousClose, instrument.id, instrument.basePrice);
  const positive = change >= 0;
  const marketStatusLabel = point.marketStatus === "HALTED" ? "TRADING HALTED" : point.marketStatus;
  const movementLabel = isAbnormalMarketStatus(point.marketStatus)
    ? marketStatusLabel
    : formatCappedPercent(percent);
  const primaryDocument = instrument.documentRefs[1] ?? instrument.documentRefs[0];
  const relatedEvents = recentEvents.filter((event) => event.involvedActors.includes(instrument.id)).slice(0, 4);
  const [selectedPoint, setSelectedPoint] = useState<MarketHistoryPoint>(() => point.history[point.history.length - 1]);
  const eventById = useMemo(() => new Map(recentEvents.map((event) => [event.id, event])), [recentEvents]);
  const selectedEvent = selectedPoint.eventIds.map((id) => eventById.get(id)).find(Boolean);
  const moveExplanation = explainRecentMove(instrument.id, point.history, recentEvents);
  const systemsProfile = humanSystemsProfiles[instrument.id];

  useEffect(() => {
    setSelectedPoint(point.history[point.history.length - 1]);
  }, [instrument.id, point.history]);

  return (
    <section className="detail-view" aria-label={`${instrument.fullName} detail`}>
      <div className="detail-toolbar">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <span>{instrument.category === "index" ? "Market Instrument" : "Corporate Actor"}</span>
      </div>

      <div className="detail-market-grid">
        <div className="primary-chart-panel">
          <div className="chart-header">
            <div>
              <p className="eyebrow">{instrument.type}</p>
              <h3>
                <span className="detail-symbol" style={{ "--instrument-color": instrument.accentColor } as CSSProperties}>
                  {instrument.symbol}
                </span>
                {instrument.fullName}
              </h3>
            </div>
            <div className="chart-price">
              <strong>{point.value.toFixed(2)}</strong>
              <span className={movementClass(change)}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)} / {movementLabel}
              </span>
            </div>
          </div>
          <MarketChart
            history={point.history}
            events={recentEvents}
            positive={positive}
            selectedPoint={selectedPoint}
            onSelectPoint={setSelectedPoint}
          />
          <section className="market-cause-panel" aria-label="Market cause">
            <div>
              <span>Market Cause</span>
              <time>{new Date(selectedPoint.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
            </div>
            {selectedEvent ? (
              <>
                <h3>{selectedEvent.headline}</h3>
                <p>{selectedEvent.summary}</p>
                <dl>
                  <div>
                    <dt>Affected</dt>
                    <dd>{selectedEvent.involvedActors.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Market impacts</dt>
                    <dd>
                      {Object.entries(selectedEvent.impacts)
                        .map(([id, value]) => `${id} ${formatImpact(value ?? 0)}`)
                        .join(", ") || "none"}
                    </dd>
                  </div>
                  <div>
                    <dt>Institutional impacts</dt>
                    <dd>
                      {Object.entries(selectedEvent.institutionImpacts)
                        .map(([id, impact]) => `${id}: ${institutionImpactSummary(impact)}`)
                        .join(" / ") || "none"}
                    </dd>
                  </div>
                  <div>
                    <dt>Tags</dt>
                    <dd>{selectedEvent.tags.join(", ")}</dd>
                  </div>
                </dl>
                {(selectedEvent.publicVisibilityDelta || selectedEvent.legalExposureDelta) ? (
                  <p className="cause-note">
                    Public visibility {formatDelta(selectedEvent.publicVisibilityDelta)}; legal exposure{" "}
                    {formatDelta(selectedEvent.legalExposureDelta)}
                  </p>
                ) : null}
                <blockquote>{selectedEvent.publicReaction ?? selectedEvent.mediaSnippet}</blockquote>
              </>
            ) : (
              <>
                <h3>Ambient market movement / no major event recorded.</h3>
                <p>{selectedPoint.note}</p>
              </>
            )}
          </section>
          <p className="current-headline">{point.headline}</p>
        </div>

        <aside className="detail-panel compact">
          <div className="pill-grid">
            <span>PUBLIC VISIBILITY: {instrument.publicVisibility}</span>
            <span>LEGAL EXPOSURE: {instrument.legalExposure}</span>
            <span>SIGNAL QUALITY: {instrument.signalQuality}</span>
          </div>

          <section>
            <h3>Profile</h3>
            <p>{instrument.profile}</p>
          </section>

          <section>
            <h3>Current Exposure</h3>
            <p>{instrument.exposure}</p>
          </section>

          <section>
            <h3>Human Systems Dependency</h3>
            <div className="systems-metrics">
              <span>Systemic {systemsProfile.systemicImportance}</span>
              <span>Strategic {systemsProfile.strategicDependency}</span>
              <span>Substitution {systemsProfile.substitutionDifficulty}</span>
            </div>
            <ul className="systems-list">
              {systemsProfile.sectors.slice(0, 3).map((sector) => (
                <li key={sector.label}>
                  {sector.share}% {sector.label}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="detail-bottom-grid">
        <section className="info-panel">
          <h3>Recent Event History</h3>
          <div className="feed-list">
            {relatedEvents.length ? (
              relatedEvents.map((event) => (
                <article className="media-item" key={event.id}>
                  <div>
                    <span>{event.source ?? event.category}</span>
                    <time>{event.severity}</time>
                  </div>
                  <h3>{event.headline}</h3>
                  <p>{event.summary}</p>
                  <EventImpactChips event={event} onSelectInstrument={onSelectInstrument} />
                </article>
              ))
            ) : (
              <p className="empty-note">No recent direct event exposure. The price is moving on baseline simulation.</p>
            )}
          </div>
        </section>

        <section className="info-panel">
          <h3>Risk / Relations</h3>
          <p className="move-explain">{moveExplanation}</p>
          <div className="tag-list">
            {instrument.riskTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            {instrument.relationshipTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className="info-panel">
          <h3>Source Excerpt</h3>
          <details className="document-excerpt" open>
            <summary>
              {primaryDocument.label} / {primaryDocument.section}
            </summary>
            <p>{excerptFor(primaryDocument.documentId, primaryDocument.section)}</p>
            <button
              className="text-link-button"
              onClick={() => onOpenDocument(primaryDocument.documentId as CodexDocumentId, primaryDocument.section)}
            >
              Open source document
            </button>
          </details>

          <div className="document-link-list">
            {instrument.documentRefs.map((reference) => (
              <button
                key={`${reference.documentId}-${reference.section}`}
                onClick={() => onOpenDocument(reference.documentId as CodexDocumentId, reference.section)}
              >
                <span>{reference.label}</span>
                <small>{getDocument(reference.documentId).filename}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
