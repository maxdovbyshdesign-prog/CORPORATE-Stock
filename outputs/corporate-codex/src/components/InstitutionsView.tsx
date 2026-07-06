import type { InstitutionState } from "../App";
import { type CodexDocumentId } from "../data/documents";
import type { Institution, InstitutionId } from "../data/entities";
import type { MarketEvent } from "../data/events";

type InstitutionsViewProps = {
  institutions: InstitutionState;
  selectedInstitutionId: InstitutionId;
  recentEvents: MarketEvent[];
  onSelect: (id: InstitutionId) => void;
  onOpenDocument: (documentId: CodexDocumentId, section?: string) => void;
};

const Metric = ({ label, value }: { label: string; value: number }) => {
  const displayValue = Math.round(Math.max(0, Math.min(100, value)));

  return (
    <div className="institution-metric">
      <span>{label}</span>
      <strong>{displayValue}%</strong>
      <div>
        <i style={{ width: `${displayValue}%` }} />
      </div>
    </div>
  );
};

const InstitutionCard = ({
  institution,
  selected,
  onSelect,
}: {
  institution: Institution;
  selected: boolean;
  onSelect: (id: InstitutionId) => void;
}) => (
  <button className={`institution-card ${selected ? "selected" : ""}`} onClick={() => onSelect(institution.id)}>
    <div>
      <p className="eyebrow">{institution.type}</p>
      <h3>{institution.id} / {institution.fullName}</h3>
    </div>
    <span className="institution-status-pill">{institution.currentStatus}</span>
    <Metric label="Credibility" value={institution.credibility} />
    <Metric label="Operational Capacity" value={institution.operationalCapacity} />
    <Metric label="Enforcement Capacity" value={institution.enforcementCapacity} />
    <p>{institution.latestStatement}</p>
  </button>
);

export function InstitutionsView({
  institutions,
  selectedInstitutionId,
  recentEvents,
  onSelect,
  onOpenDocument,
}: InstitutionsViewProps) {
  const institutionList = Object.values(institutions);
  const selectedInstitution = institutions[selectedInstitutionId];
  const relatedEvents = recentEvents
    .filter((event) => event.involvedActors.includes(selectedInstitutionId))
    .slice(0, 4);

  return (
    <section className="institutions-view" aria-label="Institutions">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Political Actors</p>
          <h2>Institutions</h2>
        </div>
        <span>NOT TRADED</span>
      </div>

      <div className="institution-layout">
        <div className="institution-list">
          {institutionList.map((institution) => (
            <InstitutionCard
              key={institution.id}
              institution={institution}
              selected={selectedInstitutionId === institution.id}
              onSelect={onSelect}
            />
          ))}
        </div>

        <aside className="institution-detail info-panel">
          <p className="eyebrow">{selectedInstitution.type}</p>
          <h2>{selectedInstitution.fullName}</h2>
          <span className="institution-status-pill detail-status">{selectedInstitution.currentStatus}</span>
          <p>{selectedInstitution.profile}</p>

          <div className="institution-metrics-grid">
            <Metric label="Credibility" value={selectedInstitution.credibility} />
            <Metric label="Operational Capacity" value={selectedInstitution.operationalCapacity} />
            <Metric label="Enforcement Capacity" value={selectedInstitution.enforcementCapacity} />
            <Metric label="Mandate Integrity" value={selectedInstitution.mandateIntegrity} />
            <Metric label="Public Trust" value={selectedInstitution.publicTrust} />
            <Metric label="Signal Access" value={selectedInstitution.signalAccess} />
          </div>

          <section>
            <h3>Latest Statement</h3>
            <p>{selectedInstitution.latestStatement}</p>
          </section>
          <section>
            <h3>Recent Report / Directive</h3>
            <p>{selectedInstitution.recentDirective}</p>
          </section>
          <section>
            <h3>Related Market Impacts</h3>
            <div className="feed-list">
              {relatedEvents.map((event) => (
                <article className="media-item" key={event.id}>
                  <div>
                    <span>{event.category}</span>
                    <time>{event.severity}</time>
                  </div>
                  <h3>{event.headline}</h3>
                  <p>{event.mediaSnippet}</p>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h3>Source Documents</h3>
            <div className="document-link-list">
              {selectedInstitution.documentRefs.map((reference) => (
                <button
                  key={`${reference.documentId}-${reference.section}`}
                  onClick={() => onOpenDocument(reference.documentId as CodexDocumentId, reference.section)}
                >
                  <span>{reference.label}</span>
                  <small>{reference.section}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
