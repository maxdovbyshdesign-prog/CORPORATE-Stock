import { useMemo, useState } from "react";
import { mediaItems, type CodexDocumentId } from "../data/documents";
import type { MarketInstrumentId } from "../data/entities";
import type { MarketEvent } from "../data/events";
import {
  filterPostByPulse,
  publicPulseFilterLabels,
  type PublicPulseFilter,
  type SocialPost,
} from "../sim/socialEngine";
import { EventImpactChips } from "./EventImpactChips";

type MediaFeedProps = {
  recentEvents: MarketEvent[];
  publicPulsePosts: SocialPost[];
  onOpenDocument: (documentId: CodexDocumentId, section?: string) => void;
  onSelectInstrument: (id: MarketInstrumentId) => void;
};

const visibilityLabel = (visibility?: SocialPost["visibility"]) =>
  (visibility ?? "inner_worlds").replace(/_/g, " ");

export function MediaFeed({ recentEvents, publicPulsePosts, onOpenDocument, onSelectInstrument }: MediaFeedProps) {
  const [pulseFilter, setPulseFilter] = useState<PublicPulseFilter>("All");
  const publicReactions = recentEvents.filter((event) => event.category === "Public Reaction").slice(0, 4);
  const liveEvents = recentEvents.filter((event) => event.category !== "Public Reaction").slice(0, 8);
  const visiblePulsePosts = useMemo(
    () => publicPulsePosts.filter((post) => filterPostByPulse(post, pulseFilter)).slice(0, 12),
    [publicPulsePosts, pulseFilter],
  );

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
        <div className="feed-column">
          <h3>Live Feed</h3>
          <div className="feed-list feed-column-list">
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
          <div className="feed-list feed-column-list compact">
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

        <div className="feed-column">
          <h3>Public Pulse</h3>
          <div className="public-pulse-panel" aria-label="Public Pulse">
            <div className="pulse-heading">
              <div>
                <h3>Inner Worlds Networks / Settlement Channels</h3>
              </div>
              <span>{publicPulsePosts.length ? `${publicPulsePosts.length} signals` : "quiet"}</span>
            </div>

            <div className="pulse-filter-row" aria-label="Public Pulse filters">
              {publicPulseFilterLabels.map((filter) => (
                <button
                  className={pulseFilter === filter ? "active" : ""}
                  key={filter}
                  onClick={() => setPulseFilter(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="pulse-list">
              {visiblePulsePosts.length ? (
                visiblePulsePosts.map((post) => (
                  <article className={`pulse-post ${post.sentiment}`} key={post.id}>
                    <div className="pulse-post-header">
                      <div>
                        <strong>{post.handle}</strong>
                        <span>{post.role}{post.origin ? ` / ${post.origin}` : ""}</span>
                      </div>
                      <time>{post.simulatedTime}</time>
                    </div>
                    <p>{post.text}</p>
                    <div className="pulse-post-meta">
                      <span>{visibilityLabel(post.visibility)}</span>
                      <span>{post.sentiment}</span>
                      <span>{post.intensity}</span>
                    </div>
                    <div className="pulse-tag-row">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span key={tag}>#{tag.replace(/_/g, "")}</span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <article className="pulse-post empty">
                  <div className="pulse-post-header">
                    <div>
                      <strong>Public networks</strong>
                      <span>{pulseFilter === "All" ? "no leading pulse" : `${pulseFilter} filter`}</span>
                    </div>
                    <time>QUIET</time>
                  </div>
                  <p>No public sentiment cluster is currently leading the network scrape.</p>
                </article>
              )}
            </div>
          </div>
        </div>

        <div className="feed-column">
          <h3>Archive</h3>
          <div className="feed-list feed-column-list">
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
