import { mediaItems, type CodexDocumentId } from "../data/documents";
import type { MarketInstrumentId } from "../data/entities";
import type { MarketEvent } from "../data/events";
import { EventImpactChips } from "./EventImpactChips";

type MediaFeedProps = {
  recentEvents: MarketEvent[];
  onOpenDocument: (documentId: CodexDocumentId, section?: string) => void;
  onSelectInstrument: (id: MarketInstrumentId) => void;
};

export function MediaFeed({ recentEvents, onOpenDocument, onSelectInstrument }: MediaFeedProps) {
  const publicReactions = recentEvents.filter((event) => event.category === "Public Reaction").slice(0, 4);
  const liveEvents = recentEvents.filter((event) => event.category !== "Public Reaction").slice(0, 8);

  return (
    <section className="media-view" aria-label="Media feed">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Narrative Risk</p>
          <h2>Media Feed</h2>
        </div>
        <span>LIVE + CURATED</span>
      </div>

      <div className="feed-columns">
        <div>
          <h3>Live Feed</h3>
          <div className="feed-list">
            {liveEvents.map((event) => (
              <article className={`media-item lead ${event.severity}`} key={event.id}>
                <div>
                  <span>{event.source ?? event.category}{event.generated ? " / LIVE" : ""}</span>
                  <time>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : event.severity}</time>
                </div>
                <h3>{event.headline}</h3>
                <p>{event.summary}</p>
                <EventImpactChips event={event} onSelectInstrument={onSelectInstrument} />
                {event.publicReaction ? <blockquote>{event.publicReaction}</blockquote> : null}
              </article>
            ))}
          </div>

          <h3 className="feed-subsection-title">Public Reaction</h3>
          <div className="feed-list">
            {publicReactions.length ? (
              publicReactions.map((event) => (
                <article className="media-item public-reaction-item" key={event.id}>
                  <div>
                    <span>{event.source ?? "PUBLIC NETWORK"}</span>
                    <time>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "LIVE"}</time>
                  </div>
                  <h3>{event.headline}</h3>
                  <p>{event.summary}</p>
                </article>
              ))
            ) : (
              <article className="media-item public-reaction-item">
                <div>
                  <span>PUBLIC NETWORK</span>
                  <time>QUIET</time>
                </div>
                <p>No high-visibility reaction currently leading the network scrape.</p>
              </article>
            )}
          </div>
        </div>

        <div>
          <h3>Archive</h3>
          <div className="feed-list">
            {mediaItems.map((item) => (
              <article className="media-item" key={item.id}>
                <div>
                  <span>{item.kind}</span>
                  <time>{item.time}</time>
                </div>
                <h3>{item.source}</h3>
                <p>{item.body}</p>
                <button className="text-link-button" onClick={() => onOpenDocument(item.documentId, item.section)}>
                  Open fragment
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
