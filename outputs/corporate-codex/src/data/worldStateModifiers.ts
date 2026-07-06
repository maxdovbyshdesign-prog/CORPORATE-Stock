import type { EntityId } from "./entities";
import type { EventTag, MarketEvent } from "./events";
import { getStorylineLane, type StorylineLaneId } from "./storylineLanes";

export type WorldStateModifierId =
  | "severe-flare-window"
  | "psa-militia-formation"
  | "liberation-front-broadcast"
  | "inner-worlds-oversight-committee"
  | "smuggler-route-opens"
  | "habitat-tenant-strike"
  | "archive-mirror-leak"
  | "quiet-capital-backstop";

export type WorldStateModifierType =
  | "environmental"
  | "political / security"
  | "social / insurgent media"
  | "regulatory"
  | "logistics / shadow economy"
  | "civilian / labor"
  | "evidence / information control"
  | "capital / stabilization";

export type WorldStateModifier = {
  id: WorldStateModifierId;
  title: string;
  summary: string;
  type: WorldStateModifierType;
  affectedLaneIds: StorylineLaneId[];
  activationHints: string[];
  activationTags: EventTag[];
  activationPatterns: string[];
  activationActors?: EntityId[];
  boostedSemanticPatterns: string[];
  suppressedSemanticPatterns: string[];
  boostedTags: EventTag[];
  publicToneHints: string[];
  minDurationEvents: number;
  maxDurationEvents: number;
  cooldownEvents: number;
};

export type ActiveWorldStateModifier = {
  modifier: WorldStateModifier;
  score: number;
  activationReason: string;
  remainingEvents: number;
  activationAgeEvents: number;
};

export type WorldStateModifierBias = {
  score: number;
  notes: string[];
  favored: boolean;
  suppressed: boolean;
  material: boolean;
};

export type WorldStateModifierDiagnostics = {
  active?: ActiveWorldStateModifier;
  recentInfluencedEvents: Array<{ pattern: string; modifierTitle: string }>;
  recentlyExpired: string[];
};

export const worldStateModifiers: WorldStateModifier[] = [
  {
    id: "severe-flare-window",
    title: "Severe Flare Window",
    summary: "A stronger-than-forecast stellar flare window is degrading relay reliability and delaying verified access.",
    type: "environmental",
    affectedLaneIds: ["relay-access-crisis", "cargo-sovereignty-dispute"],
    activationHints: ["communications, blackout, and flare pressure are clustering"],
    activationTags: ["communications", "blackout", "flare", "transport"],
    activationPatterns: ["LUMEN:observer_bandwidth_failure", "LUMEN:relay_stabilization", "UNICOL:access_window_expired"],
    activationActors: ["LUMEN", "UNICOL", "ANCHOR"],
    boostedSemanticPatterns: [
      "LUMEN:observer_bandwidth_failure",
      "LUMEN:relay_stabilization",
      "UNICOL:access_window_expired",
      "ANCHOR:cargo_window_delay",
      "SYNOPTIC:archive_discrepancy",
    ],
    suppressedSemanticPatterns: ["UNICOL:verified_access", "ANCHOR:alternate_transfer_route"],
    boostedTags: ["communications", "blackout", "flare", "transport"],
    publicToneHints: ["relay access", "verification delay", "cargo timing"],
    minDurationEvents: 6,
    maxDurationEvents: 10,
    cooldownEvents: 9,
  },
  {
    id: "psa-militia-formation",
    title: "PSA Militia Formation",
    summary: "Local authority figures begin organizing ad-hoc enforcement capacity outside normal institutional channels.",
    type: "political / security",
    affectedLaneIds: ["corridor-12b-licensing", "muto-classification-inquiry", "habitat-dependency-crisis"],
    activationHints: ["PSA, legal exposure, and civilian-harm pressure are rising while formal enforcement remains weak"],
    activationTags: ["psa", "legal_exposure", "civilian_harm", "oversight"],
    activationPatterns: ["PSA:directive_low_enforcement", "PSA:licensing_objection", "PSA:unenforced_directive_expiry"],
    activationActors: ["PSA", "OPSEC", "EXEX"],
    boostedSemanticPatterns: [
      "PSA:directive_low_enforcement",
      "PSA:licensing_objection",
      "OPSEC:oversight_liability",
      "OPSEC:muto_feed_leak",
      "EXEX:blanket_denial",
    ],
    suppressedSemanticPatterns: ["OPSEC:contract_expansion", "EXEX:investor_call"],
    boostedTags: ["psa", "legal_exposure", "civilian_harm", "oversight"],
    publicToneHints: ["local enforcement", "paper authority", "contractor exposure"],
    minDurationEvents: 6,
    maxDurationEvents: 10,
    cooldownEvents: 10,
  },
  {
    id: "liberation-front-broadcast",
    title: "Liberation Front Broadcast",
    summary: "An anti-corporate broadcast network claims responsibility for circulating corridor testimony and contractor footage.",
    type: "social / insurgent media",
    affectedLaneIds: ["muto-classification-inquiry", "corridor-12b-licensing", "fatality-recognition-dispute"],
    activationHints: ["public visibility and evidence pressure are clustering around OPSEC or SYNOPTIC"],
    activationTags: ["public_visibility", "footage_leak", "data_suppression", "legal_exposure"],
    activationPatterns: ["OPSEC:muto_feed_leak", "SYNOPTIC:archive_discrepancy", "SYNOPTIC:redacted_stills_release"],
    activationActors: ["OPSEC", "SYNOPTIC", "EXEX", "HALCYON"],
    boostedSemanticPatterns: [
      "OPSEC:muto_feed_leak",
      "SYNOPTIC:archive_discrepancy",
      "EXEX:blanket_denial",
      "HALCYON:regulatory_half_life",
      "PSA:unenforced_directive_expiry",
    ],
    suppressedSemanticPatterns: ["EXEX:investor_call", "OPSEC:contract_expansion"],
    boostedTags: ["public_visibility", "footage_leak", "data_suppression", "legal_exposure"],
    publicToneHints: ["testimony", "contractor footage", "anti-corporate circulation"],
    minDurationEvents: 6,
    maxDurationEvents: 9,
    cooldownEvents: 10,
  },
  {
    id: "inner-worlds-oversight-committee",
    title: "Inner Worlds Oversight Committee",
    summary: "Inner Worlds regulators open a procedural review into casualty recognition, contractor oversight, and evidence custody.",
    type: "regulatory",
    affectedLaneIds: ["fatality-recognition-dispute", "muto-classification-inquiry", "corridor-12b-licensing"],
    activationHints: ["legal exposure, insurance, and oversight pressure are converging"],
    activationTags: ["legal_exposure", "insurance", "oversight", "data_suppression"],
    activationPatterns: ["HALCYON:regulatory_half_life", "OPSEC:oversight_liability", "SYNOPTIC:archive_discrepancy"],
    activationActors: ["HALCYON", "OPSEC", "SYNOPTIC", "EXEX"],
    boostedSemanticPatterns: [
      "HALCYON:regulatory_half_life",
      "OPSEC:oversight_liability",
      "SYNOPTIC:archive_discrepancy",
      "EXEX:partial_telemetry_release",
      "UNICOL:verified_access",
    ],
    suppressedSemanticPatterns: ["HALCYON:fatality_delay", "EXEX:blanket_denial"],
    boostedTags: ["legal_exposure", "insurance", "oversight", "data_suppression"],
    publicToneHints: ["procedural review", "evidence custody", "casualty recognition"],
    minDurationEvents: 7,
    maxDurationEvents: 12,
    cooldownEvents: 12,
  },
  {
    id: "smuggler-route-opens",
    title: "Smuggler Route Opens",
    summary: "Unlicensed transfer channels begin moving people, data, or concentrate around formal corridor control.",
    type: "logistics / shadow economy",
    affectedLaneIds: ["cargo-sovereignty-dispute", "corridor-12b-licensing", "relay-access-crisis"],
    activationHints: ["transport, logistics, and resource-supply pressure are clustering"],
    activationTags: ["transport", "logistics", "resource_supply", "communications"],
    activationPatterns: ["ANCHOR:cargo_window_delay", "ANCHOR:alternate_transfer_route", "MARKET:ambient_note"],
    activationActors: ["ANCHOR", "PXB-X", "EXEX", "OPSEC"],
    boostedSemanticPatterns: [
      "ANCHOR:cargo_window_delay",
      "ANCHOR:alternate_transfer_route",
      "OPSEC:contract_expansion",
      "PSA:unenforced_directive_expiry",
      "MARKET:ambient_note",
    ],
    suppressedSemanticPatterns: ["UNICOL:verified_access"],
    boostedTags: ["transport", "logistics", "resource_supply"],
    publicToneHints: ["unlicensed transfer", "shadow logistics", "formal control bypass"],
    minDurationEvents: 6,
    maxDurationEvents: 10,
    cooldownEvents: 9,
  },
  {
    id: "habitat-tenant-strike",
    title: "Habitat Tenant Strike",
    summary: "Registered-structure residents and maintenance crews coordinate a service refusal around life-support dependency and reconstruction terms.",
    type: "civilian / labor",
    affectedLaneIds: ["habitat-dependency-crisis", "fatality-recognition-dispute", "corridor-12b-licensing"],
    activationHints: ["DOMUS, habitat, and civilian-harm pressure are clustering"],
    activationTags: ["habitat_failure", "civilian_harm", "reconstruction", "psa"],
    activationPatterns: ["DOMUS:service_interruption", "DOMUS:verified_restoration", "HALCYON:fatality_delay"],
    activationActors: ["DOMUS", "PSA", "HALCYON", "UNICOL"],
    boostedSemanticPatterns: [
      "DOMUS:service_interruption",
      "DOMUS:verified_restoration",
      "HALCYON:fatality_delay",
      "PSA:directive_low_enforcement",
      "UNICOL:verified_access",
    ],
    suppressedSemanticPatterns: ["DOMUS:verified_restoration"],
    boostedTags: ["habitat_failure", "civilian_harm", "reconstruction", "psa"],
    publicToneHints: ["registered-structure refusal", "service dependency", "reconstruction terms"],
    minDurationEvents: 6,
    maxDurationEvents: 9,
    cooldownEvents: 10,
  },
  {
    id: "archive-mirror-leak",
    title: "Archive Mirror Leak",
    summary: "A mirrored evidence archive appears outside SYNOPTIC-controlled access channels.",
    type: "evidence / information control",
    affectedLaneIds: ["muto-classification-inquiry", "relay-access-crisis", "corridor-12b-licensing"],
    activationHints: ["data suppression, footage leaks, and public visibility are clustering"],
    activationTags: ["data_suppression", "footage_leak", "public_visibility", "verified_access"],
    activationPatterns: ["SYNOPTIC:archive_discrepancy", "SYNOPTIC:redacted_stills_release", "OPSEC:muto_feed_leak"],
    activationActors: ["SYNOPTIC", "OPSEC", "UNICOL", "EXEX"],
    boostedSemanticPatterns: [
      "SYNOPTIC:archive_discrepancy",
      "SYNOPTIC:redacted_stills_release",
      "OPSEC:muto_feed_leak",
      "EXEX:partial_telemetry_release",
      "UNICOL:verified_access",
    ],
    suppressedSemanticPatterns: ["EXEX:blanket_denial"],
    boostedTags: ["data_suppression", "footage_leak", "public_visibility", "verified_access"],
    publicToneHints: ["mirror archive", "evidence access", "custody breach"],
    minDurationEvents: 6,
    maxDurationEvents: 10,
    cooldownEvents: 10,
  },
  {
    id: "quiet-capital-backstop",
    title: "Quiet Capital Backstop",
    summary: "Long-horizon capital begins stabilizing exposed operators while extracting control over future reconstruction and logistics.",
    type: "capital / stabilization",
    affectedLaneIds: ["cargo-sovereignty-dispute", "habitat-dependency-crisis", "corridor-12b-licensing"],
    activationHints: ["managed or post-crisis plateau is unresolved but price action has narrowed"],
    activationTags: ["resource_supply", "transport", "reconstruction", "extraction"],
    activationPatterns: ["EXEX:investor_call", "ANCHOR:alternate_transfer_route", "DOMUS:verified_restoration", "MARKET:ambient_note"],
    activationActors: ["EXEX", "ANCHOR", "DOMUS", "PXB-X"],
    boostedSemanticPatterns: ["EXEX:investor_call", "ANCHOR:alternate_transfer_route", "DOMUS:verified_restoration", "MARKET:ambient_note"],
    suppressedSemanticPatterns: ["EXEX:blanket_denial"],
    boostedTags: ["resource_supply", "transport", "reconstruction", "extraction"],
    publicToneHints: ["stabilization with control rights", "patient capital", "moral cost"],
    minDurationEvents: 7,
    maxDurationEvents: 12,
    cooldownEvents: 12,
  },
];

const modifierById = new Map(worldStateModifiers.map((modifier) => [modifier.id, modifier]));
const ACTIVE_MODIFIER_SCORE_THRESHOLD = 8.4;
const MEANINGFUL_BIAS_THRESHOLD = 0.08;

const countOverlap = <T,>(left: T[] = [], right: T[] = []) => left.reduce((sum, item) => sum + (right.includes(item) ? 1 : 0), 0);

const eventTime = (event: MarketEvent) => event.simulatedTimestamp ?? event.timestamp ?? 0;

const recentFirst = (events: MarketEvent[]) => [...events].sort((a, b) => eventTime(b) - eventTime(a));

const semanticPatternFor = (event: MarketEvent) => event.semanticPattern ?? event.templateId ?? `${event.involvedActors[0] ?? "MARKET"}:${event.tags[0] ?? event.category}`;

const recentModifierCount = (events: MarketEvent[], modifierId: WorldStateModifierId) =>
  recentFirst(events)
    .slice(0, 18)
    .filter((event) => event.worldModifierId === modifierId).length;

const mostRecentActivationAge = (events: MarketEvent[], modifier: WorldStateModifier) => {
  const recent = recentFirst(events);
  const index = recent.findIndex(
    (event) =>
      modifier.activationPatterns.includes(semanticPatternFor(event)) ||
      countOverlap(modifier.activationTags, event.tags) >= 2 ||
      countOverlap(modifier.activationActors ?? [], event.involvedActors) >= 2,
  );
  return index < 0 ? 99 : index;
};

const scoreModifier = ({
  modifier,
  recentEvents,
  marketRegime,
  psaEnforcementCapacity,
}: {
  modifier: WorldStateModifier;
  recentEvents: MarketEvent[];
  marketRegime?: string;
  psaEnforcementCapacity?: number;
}) => {
  const recent = recentFirst(recentEvents).slice(0, 14);
  const weighted = recent.reduce(
    (score, event, index) => {
      const decay = Math.pow(0.82, index);
      const patternMatch = modifier.activationPatterns.includes(semanticPatternFor(event)) ? 2.2 : 0;
      const tagMatch = countOverlap(modifier.activationTags, event.tags) * 0.55;
      const actorMatch = countOverlap(modifier.activationActors ?? [], event.involvedActors) * 0.35;
      return score + (patternMatch + tagMatch + actorMatch) * decay;
    },
    0,
  );
  const regimeBoost =
    modifier.id === "quiet-capital-backstop" && (marketRegime === "MANAGED_PLATEAU" || marketRegime === "POST_CRISIS_PLATEAU")
      ? 2.1
      : 0;
  const weakPsaBoost =
    modifier.id === "psa-militia-formation" && psaEnforcementCapacity !== undefined && psaEnforcementCapacity < 45 ? 1.5 : 0;

  return Number((weighted + regimeBoost + weakPsaBoost).toFixed(2));
};

export const deriveActiveWorldStateModifier = ({
  recentEvents,
  marketRegime,
  psaEnforcementCapacity,
}: {
  recentEvents: MarketEvent[];
  marketRegime?: string;
  psaEnforcementCapacity?: number;
}): ActiveWorldStateModifier | undefined => {
  if (recentEvents.length < 10) return undefined;

  const scored = worldStateModifiers
    .map((modifier) => {
      const activationAgeEvents = mostRecentActivationAge(recentEvents, modifier);
      const score = scoreModifier({ modifier, recentEvents, marketRegime, psaEnforcementCapacity });
      const influencedCount = recentModifierCount(recentEvents, modifier.id);
      const duration = Math.min(modifier.maxDurationEvents, modifier.minDurationEvents + Math.floor(Math.max(0, score - 7.4)));
      const remainingEvents = Math.max(0, duration - activationAgeEvents);
      const coolingDown = influencedCount >= modifier.maxDurationEvents && activationAgeEvents < modifier.cooldownEvents;

      return {
        modifier,
        score,
        activationAgeEvents,
        remainingEvents,
        coolingDown,
      };
    })
    .filter((item) => item.score >= ACTIVE_MODIFIER_SCORE_THRESHOLD && item.remainingEvents > 0 && !item.coolingDown)
    .sort((a, b) => b.score - a.score);

  const selected = scored[0];
  if (!selected) return undefined;

  const tagHint = selected.modifier.activationTags.slice(0, 3).join(", ");
  const activationReason =
    selected.modifier.id === "quiet-capital-backstop"
      ? `${selected.modifier.activationHints[0]}; recent pressure score ${selected.score.toFixed(1)}`
      : `${selected.modifier.activationHints[0]}; recent ${tagHint} pressure score ${selected.score.toFixed(1)}`;

  return {
    modifier: selected.modifier,
    score: selected.score,
    activationReason,
    remainingEvents: selected.remainingEvents,
    activationAgeEvents: selected.activationAgeEvents,
  };
};

export const worldStateModifierBiasFor = (
  active: ActiveWorldStateModifier | undefined,
  candidate: { semanticPattern: string; tags: EventTag[] },
): WorldStateModifierBias => {
  if (!active) return { score: 0, notes: [], favored: false, suppressed: false, material: false };

  const { modifier } = active;
  const patternBoost = modifier.boostedSemanticPatterns.includes(candidate.semanticPattern) ? 0.1 : 0;
  const tagBoost = Math.min(0.06, countOverlap(modifier.boostedTags, candidate.tags) * 0.02);
  const patternPenalty = modifier.suppressedSemanticPatterns.includes(candidate.semanticPattern) ? -0.12 : 0;
  const score = Number((patternBoost + tagBoost + patternPenalty).toFixed(3));
  const favored = patternBoost + tagBoost > 0;
  const suppressed = patternPenalty < 0;
  const material = patternBoost > 0 || suppressed || Math.abs(score) >= MEANINGFUL_BIAS_THRESHOLD;

  return {
    score,
    favored,
    suppressed,
    material,
    notes: [
      material && favored ? `Modifier bias favored ${candidate.semanticPattern} under ${modifier.title}.` : "",
      material && suppressed ? `Modifier bias suppressed ${candidate.semanticPattern} under ${modifier.title}.` : "",
    ].filter(Boolean),
  };
};

export const worldStateModifierDiagnostics = (events: MarketEvent[], active?: ActiveWorldStateModifier): WorldStateModifierDiagnostics => {
  const recent = recentFirst(events).slice(0, 40);
  const recentInfluencedEvents = recent
    .filter((event) => event.worldModifierId && event.worldModifierTitle)
    .slice(0, 8)
    .map((event) => ({
      pattern: semanticPatternFor(event),
      modifierTitle: event.worldModifierTitle ?? modifierById.get(event.worldModifierId as WorldStateModifierId)?.title ?? String(event.worldModifierId),
    }));
  const recentlyExpired = worldStateModifiers
    .filter((modifier) => !active || active.modifier.id !== modifier.id)
    .filter((modifier) => {
      const influenced = recentModifierCount(events, modifier.id);
      const age = mostRecentActivationAge(events, modifier);
      return influenced >= modifier.minDurationEvents && age < modifier.cooldownEvents;
    })
    .map((modifier) => modifier.title);

  return { active, recentInfluencedEvents, recentlyExpired };
};

export const worldStateModifierLaneTitles = (modifier: WorldStateModifier) =>
  modifier.affectedLaneIds.map((laneId) => getStorylineLane(laneId).title);
