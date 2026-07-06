import type { EntityId } from "./entities";
import type { EventTag, MarketEvent } from "./events";

export type StorylineLaneId =
  | "corridor-12b-licensing"
  | "fatality-recognition-dispute"
  | "relay-access-crisis"
  | "cargo-sovereignty-dispute"
  | "muto-classification-inquiry"
  | "habitat-dependency-crisis";

export type StorylineLane = {
  id: StorylineLaneId;
  title: string;
  focus: string;
  coreActors: EntityId[];
  relatedPatterns: string[];
  relatedTags: EventTag[];
  reactionFamilies?: string[];
};

export type StorylineLaneClassification = {
  primaryLaneId: StorylineLaneId;
  primaryLaneTitle: string;
  secondaryLaneIds: StorylineLaneId[];
  focus: string;
  score: number;
};

export type StorylineLaneSummary = {
  dominantLane?: StorylineLane;
  activeLanes: Array<{ lane: StorylineLane; count: number; status: "elevated" | "active" }>;
  laneCounts: Array<{ lane: StorylineLane; count: number }>;
  topPatternPairs: Array<{ lane: StorylineLane; pattern: string; count: number }>;
  recentTransitions: string[];
};

export const storylineLanes: StorylineLane[] = [
  {
    id: "corridor-12b-licensing",
    title: "Corridor 12-B Licensing Dispute",
    focus: "Legal authority, extraction rights, commercial confidentiality, weak PSA enforcement.",
    coreActors: ["EXEX", "PSA", "OPSEC", "UNICOL", "OCI"],
    relatedPatterns: [
      "EXEX:blanket_denial",
      "EXEX:partial_telemetry_release",
      "EXEX:investor_call",
      "PSA:directive_low_enforcement",
      "PSA:licensing_objection",
      "PSA:unenforced_directive_expiry",
    ],
    relatedTags: ["extraction", "pipeline", "legal_exposure", "psa", "denial", "partial_admission"],
    reactionFamilies: ["denial-fatigue"],
  },
  {
    id: "fatality-recognition-dispute",
    title: "Fatality Recognition Dispute",
    focus: "Insurance recognition, delayed casualty accounting, litigation exposure, families outside the accounting event.",
    coreActors: ["HALCYON", "OCI", "DOMUS", "UNICOL", "PSA"],
    relatedPatterns: [
      "HALCYON:fatality_delay",
      "HALCYON:regulatory_half_life",
      "DOMUS:service_interruption",
      "DOMUS:verified_restoration",
      "UNICOL:verified_access",
    ],
    relatedTags: ["insurance", "civilian_harm", "legal_exposure", "habitat_failure", "verified_access"],
    reactionFamilies: ["insurance-cruelty"],
  },
  {
    id: "relay-access-crisis",
    title: "Relay Access Crisis",
    focus: "Communications, paid priority routes, observer bandwidth, signal access, flare windows.",
    coreActors: ["LUMEN", "UNICOL", "SYNOPTIC", "PSA", "OCI"],
    relatedPatterns: [
      "LUMEN:relay_stabilization",
      "LUMEN:observer_bandwidth_failure",
      "UNICOL:access_window_expired",
      "UNICOL:verified_access",
      "SYNOPTIC:redacted_stills_release",
    ],
    relatedTags: ["communications", "blackout", "flare", "data_suppression", "verified_access"],
    reactionFamilies: ["pricing", "evidence"],
  },
  {
    id: "cargo-sovereignty-dispute",
    title: "Cargo Sovereignty Dispute",
    focus: "Resource delivery, cargo windows, transfer lattice, scarcity versus delivery confidence.",
    coreActors: ["ANCHOR", "PXB-X", "EXEX", "CARBON", "HALCYON"],
    relatedPatterns: ["ANCHOR:cargo_window_delay", "ANCHOR:alternate_transfer_route", "CARBON:adoption_confidence_attack", "EXEX:investor_call"],
    relatedTags: ["resource_supply", "transport", "logistics", "fuel_competition", "safety_review"],
  },
  {
    id: "muto-classification-inquiry",
    title: "MUTO Classification Inquiry",
    focus: "Autonomous violence, contractor deniability, classification gaps, security oversight.",
    coreActors: ["OPSEC", "ACSB", "SYNOPTIC", "UNICOL", "OCI"],
    relatedPatterns: ["OPSEC:muto_feed_leak", "OPSEC:oversight_liability", "OPSEC:contract_expansion", "SYNOPTIC:archive_discrepancy"],
    relatedTags: ["security_contract", "oversight", "footage_leak", "data_suppression", "public_visibility"],
    reactionFamilies: ["contractor-liability", "evidence"],
  },
  {
    id: "habitat-dependency-crisis",
    title: "Habitat Dependency Crisis",
    focus: "Life support as service, registered structures, reconstruction dependency, civilian infrastructure.",
    coreActors: ["DOMUS", "PSA", "HALCYON", "OCI", "UNICOL"],
    relatedPatterns: [
      "DOMUS:service_interruption",
      "DOMUS:verified_restoration",
      "HALCYON:fatality_delay",
      "PSA:directive_low_enforcement",
      "UNICOL:verified_access",
    ],
    relatedTags: ["habitat_failure", "reconstruction", "civilian_harm", "verified_access", "psa"],
    reactionFamilies: ["subscription-life"],
  },
];

const fallbackLane = storylineLanes[0];

const overlapCount = <T,>(left: T[] = [], right: T[] = []) => left.reduce((sum, item) => sum + (right.includes(item) ? 1 : 0), 0);

const scoreLaneForEvent = (lane: StorylineLane, event: MarketEvent) => {
  const semanticScore = event.semanticPattern && lane.relatedPatterns.includes(event.semanticPattern) ? 8 : 0;
  const reactionScore = event.publicReactionFamily && lane.reactionFamilies?.includes(event.publicReactionFamily) ? 4 : 0;
  const actorScore = overlapCount(lane.coreActors, event.involvedActors) * 2;
  const tagScore = overlapCount(lane.relatedTags, event.tags);
  const ambientResourceScore =
    lane.id === "cargo-sovereignty-dispute" &&
    event.semanticPattern === "MARKET:ambient_note" &&
    (event.tags.includes("resource_supply") || event.tags.includes("transport"))
      ? 5
      : 0;

  return semanticScore + reactionScore + actorScore + tagScore + ambientResourceScore;
};

export const classifyEventStorylineLanes = (event: MarketEvent): StorylineLaneClassification => {
  const scored = storylineLanes
    .map((lane) => ({ lane, score: scoreLaneForEvent(lane, event) }))
    .sort((a, b) => b.score - a.score);
  const primary = scored[0]?.score > 0 ? scored[0] : { lane: fallbackLane, score: 0 };
  const secondaryLaneIds = scored
    .filter(({ lane, score }) => lane.id !== primary.lane.id && score >= Math.max(4, primary.score * 0.45))
    .slice(0, 2)
    .map(({ lane }) => lane.id);

  return {
    primaryLaneId: primary.lane.id,
    primaryLaneTitle: primary.lane.title,
    secondaryLaneIds,
    focus: primary.lane.focus,
    score: primary.score,
  };
};

export const getStorylineLane = (laneId: StorylineLaneId) => storylineLanes.find((lane) => lane.id === laneId) ?? fallbackLane;

export const summarizeStorylineLanes = (events: MarketEvent[]): StorylineLaneSummary => {
  const recent = events.slice(-80);
  const laneCounts = new Map<StorylineLaneId, number>();
  const patternCounts = new Map<string, number>();
  const classified = recent.map((event) => ({ event, lane: classifyEventStorylineLanes(event) }));

  for (const item of classified) {
    laneCounts.set(item.lane.primaryLaneId, (laneCounts.get(item.lane.primaryLaneId) ?? 0) + 1);
    for (const secondary of item.lane.secondaryLaneIds) laneCounts.set(secondary, (laneCounts.get(secondary) ?? 0) + 0.5);
    if (item.event.semanticPattern) {
      const key = `${item.lane.primaryLaneId}|${item.event.semanticPattern}`;
      patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
    }
  }

  const laneCountEntries = [...laneCounts.entries()]
    .map(([laneId, count]) => ({ lane: getStorylineLane(laneId), count }))
    .sort((a, b) => b.count - a.count);
  const maxCount = laneCountEntries[0]?.count ?? 0;
  const activeLanes = laneCountEntries
    .filter(({ count }) => count >= 2 || count >= maxCount * 0.25)
    .slice(0, 5)
    .map(({ lane, count }) => ({ lane, count, status: count >= Math.max(4, maxCount * 0.6) ? "elevated" as const : "active" as const }));

  const transitions: string[] = [];
  let previousLaneId: StorylineLaneId | undefined;
  for (const item of classified.slice(-20)) {
    if (previousLaneId && previousLaneId !== item.lane.primaryLaneId) {
      transitions.push(`${getStorylineLane(previousLaneId).title} -> ${item.lane.primaryLaneTitle}`);
    }
    previousLaneId = item.lane.primaryLaneId;
  }

  const topPatternPairs = [...patternCounts.entries()]
    .map(([key, count]) => {
      const [laneId, pattern] = key.split("|") as [StorylineLaneId, string];
      return { lane: getStorylineLane(laneId), pattern, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    dominantLane: laneCountEntries[0]?.lane,
    activeLanes,
    laneCounts: laneCountEntries,
    topPatternPairs,
    recentTransitions: transitions.slice(-6),
  };
};
