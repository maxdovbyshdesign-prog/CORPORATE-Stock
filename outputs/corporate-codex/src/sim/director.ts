import { getInstitution, getMarketInstrument, institutions, marketInstruments, type EntityId, type InstitutionId, type MarketInstrumentId } from "../data/entities";
import type { EventCategory, EventTag, InstitutionImpact, MarketEvent } from "../data/events";
import { places, type GeneratedNewsCategory } from "../data/newsTemplates";
import type { InstitutionState, MarketState } from "../App";
import type { MarketRegime } from "../lib/marketModel";
import type { NewsIntensity } from "../lib/newsEngine";

// Current flow note for the spike:
// The legacy event flow lives in newsEngine.ts. It picks a written NewsTemplate,
// fills text slots, converts it into MarketEvent, then App.tsx attaches simulated
// time, adjusts impacts through institution/regime/memory rules, may add a public
// reaction, updates market/institution state, and marketModel.ts exports the session.
// This director sits before rendering: it chooses a semantic intent first, renders
// copy second, and lets the existing market application pipeline remain intact.

export type EventIntent = {
  id: string;
  archetypeId: string;
  actorId: MarketInstrumentId | InstitutionId;
  targetIds: EntityId[];
  action: string;
  cause: string;
  locationId?: string;
  phase?: string;
  regime?: MarketRegime;
  tags: EventTag[];
  severity: number;
  noveltyScore: number;
  marketLogic: string;
  suggestedImpacts: Partial<Record<MarketInstrumentId, number>>;
  publicReactionCandidate?: string;
  publicReactionFamily?: string;
  semanticPattern: string;
  directorNotes: string[];
};

type PressureKey =
  | "exexLegalPressure"
  | "exexDenialFatigue"
  | "opsecProfitFromChaos"
  | "opsecLiabilityAccumulation"
  | "halcyonDelayFatigue"
  | "ociOverheated"
  | "unicolCredibility"
  | "unicolOperationalCapacity"
  | "psaCredibility"
  | "psaEnforcement"
  | "publicVisibilitySaturation"
  | "pxbScarcityPressure"
  | "pxbDeliveryConfidencePressure"
  | "carbonAdoptionAttackPressure"
  | "anchorTransportReliability"
  | "domusSettlementStress"
  | "lumenRelayStress"
  | "synopticSuppressionPressure";

export type DirectorPressureModel = Record<PressureKey, number> & {
  marketRegime: MarketRegime;
  activeStorylinePhase: string;
};

type ImpactRule = Partial<Record<MarketInstrumentId, number>>;

export type EventArchetype = {
  id: string;
  actorId: MarketInstrumentId | InstitutionId;
  action: string;
  category: GeneratedNewsCategory;
  source: string;
  allowedRegimes?: MarketRegime[];
  outputTags: EventTag[];
  baseSeverity: number;
  cooldownCycles: number;
  semanticPattern: string;
  pressureDrivers: PressureKey[];
  pressureRelief?: PressureKey[];
  pressureIncrease?: PressureKey[];
  impactRules: ImpactRule;
  institutionImpacts?: Partial<Record<InstitutionId, InstitutionImpact>>;
  headlineTemplates: string[];
  bodyTemplates: string[];
  marketStateTemplates?: string[];
  targetIds: EntityId[];
  locations?: string[];
  publicReactionFamily?: string;
};

export type EventDirectorContext = {
  market: MarketState;
  institutionsState: InstitutionState;
  recentEvents: MarketEvent[];
  marketRegime: MarketRegime;
  intensity: NewsIntensity;
  activeStorylinePhase: string;
};

type DirectorCandidate = {
  archetype: EventArchetype;
  score: number;
  pressureScore: number;
  noveltyScore: number;
  notes: string[];
  rejections: string[];
  softGated: boolean;
  forcedFallback?: boolean;
};

const categoryMap: Record<GeneratedNewsCategory, EventCategory> = {
  breaking: "Breaking",
  market_note: "Market Note",
  official_statement: "Official Statement",
  observer_update: "Observer Update",
  psa_directive: "PSA Directive",
  public_reaction: "Public Reaction",
  leak: "Leak",
  analyst_note: "Analyst Note",
};

const marketIds = marketInstruments.map((instrument) => instrument.id);
const institutionIds = institutions.map((institution) => institution.id);
const isMarketId = (id: EntityId): id is MarketInstrumentId => marketIds.includes(id as MarketInstrumentId);
const isInstitutionId = (id: EntityId): id is InstitutionId => institutionIds.includes(id as InstitutionId);
const choice = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const countWhere = <T,>(items: T[], predicate: (item: T) => boolean) => items.filter(predicate).length;
const decayedCountWhere = <T,>(items: T[], predicate: (item: T) => boolean, decay = 0.86) =>
  items.reduce((sum, item, index) => (predicate(item) ? sum + Math.pow(decay, index) : sum), 0);
const normalizePressure = (raw: number, scale: number, cap = 0.92) =>
  Number((cap * (raw / (raw + scale))).toFixed(3));

const entityLabel = (id: EntityId) => (isMarketId(id) ? getMarketInstrument(id).fullName : getInstitution(id).fullName);

const eventSemanticPattern = (event: MarketEvent) => {
  if (event.semanticPattern) return event.semanticPattern;
  if (event.templateId) return event.templateId;
  const headline = event.headline.toLowerCase();
  if (event.involvedActors.includes("EXEX") && /denies|denial|confidentiality/.test(headline)) return "EXEX:blanket_denial";
  if (event.involvedActors.includes("HALCYON") && /fatality|recognition|exclusion|delay/.test(headline)) return "HALCYON:fatality_delay";
  if (event.involvedActors.includes("OPSEC") && event.tags.includes("security_contract")) return "OPSEC:contract_expansion";
  if (event.involvedActors.includes("CARBON") && event.tags.includes("safety_review")) return "CARBON:adoption_confidence_attack";
  if (event.involvedActors.includes("DOMUS") && event.tags.includes("reconstruction")) return "DOMUS:verified_restoration";
  if (event.involvedActors.includes("LUMEN") && event.tags.includes("communications")) return "LUMEN:relay_event";
  if (event.involvedActors.includes("SYNOPTIC") && event.tags.includes("data_suppression")) return "SYNOPTIC:imagery_control";
  return `${event.involvedActors[0] ?? "MARKET"}:${event.tags[0] ?? event.category}`;
};

const actorAction = (event: MarketEvent) => `${event.involvedActors[0] ?? "MARKET"}:${eventSemanticPattern(event).split(":")[1] ?? event.category}`;

const locationFromEvent = (event: MarketEvent) =>
  places.find((place) => event.headline.includes(place) || event.summary.includes(place)) ?? "";

const countConsecutiveSemantic = (events: MarketEvent[], semanticPattern: string) => {
  let count = 0;
  for (const event of events) {
    if (eventSemanticPattern(event) !== semanticPattern) break;
    count += 1;
  }
  return count;
};

export const computeDirectorPressures = ({
  market,
  institutionsState,
  recentEvents,
  marketRegime,
  activeStorylinePhase,
}: Omit<EventDirectorContext, "intensity">): DirectorPressureModel => {
  const recent = recentEvents.slice(0, 32);
  const countPattern = (pattern: string) => decayedCountWhere(recent, (event) => eventSemanticPattern(event) === pattern);
  const countActorTag = (actorId: EntityId, tag: EventTag) =>
    decayedCountWhere(recent, (event) => event.involvedActors.includes(actorId) && event.tags.includes(tag));
  const move = (id: MarketInstrumentId) => {
    const instrument = getMarketInstrument(id);
    const point = market[id];
    return ((point.value - point.previousClose) / Math.max(instrument.basePrice, Math.abs(point.previousClose), 1)) * 100;
  };
  const positiveRefs = (id: MarketInstrumentId) =>
    decayedCountWhere(recent, (event) => (event.impacts[id] ?? 0) > 0.1);
  const publicVisibilityEvents = decayedCountWhere(recent, (event) => event.tags.includes("public_visibility"));
  const unicol = institutionsState.UNICOL;
  const psa = institutionsState.PSA;
  const exexLegalRaw = countActorTag("EXEX", "legal_exposure") * 0.9 + publicVisibilityEvents * 0.22 + Math.max(0, -move("EXEX")) * 0.08;
  const opsecProfitRaw = positiveRefs("OPSEC") * 0.85 + countActorTag("OPSEC", "security_contract") * 0.45;
  const opsecLiabilityRaw =
    countActorTag("OPSEC", "legal_exposure") * 0.8 + countActorTag("OPSEC", "oversight") * 1.05 + publicVisibilityEvents * 0.16;
  const pxbDeliveryRaw =
    countActorTag("ANCHOR", "transport") * 0.95 + countActorTag("CARBON", "safety_review") * 0.7 + countActorTag("EXEX", "legal_exposure") * 0.35;

  return {
    exexLegalPressure: normalizePressure(exexLegalRaw, 2.4),
    exexDenialFatigue: normalizePressure(countPattern("EXEX:blanket_denial") * 1.2 + countActorTag("EXEX", "denial") * 0.8, 1.8, 0.86),
    opsecProfitFromChaos: normalizePressure(opsecProfitRaw, 2.5),
    opsecLiabilityAccumulation: normalizePressure(opsecLiabilityRaw, 2.3),
    halcyonDelayFatigue: normalizePressure(
      countPattern("HALCYON:fatality_delay") * 1.1 + countActorTag("HALCYON", "insurance") * 0.22 + countActorTag("HALCYON", "legal_exposure") * 0.55,
      2.2,
      0.9,
    ),
    ociOverheated: normalizePressure(Math.max(0, move("OCI")) * 0.2 + positiveRefs("OCI") * 0.55, 3.0),
    unicolCredibility: clamp(unicol.credibility / 100),
    unicolOperationalCapacity: clamp((unicol.operationalCapacity + unicol.signalAccess) / 200),
    psaCredibility: clamp((psa.credibility + psa.publicTrust) / 200),
    psaEnforcement: clamp(psa.enforcementCapacity / 100),
    publicVisibilitySaturation: normalizePressure(publicVisibilityEvents, 3.4, 0.9),
    pxbScarcityPressure: normalizePressure(countActorTag("PXB-X", "resource_supply") * 0.8 + countActorTag("EXEX", "pipeline") * 0.8 + Math.max(0, move("PXB-X")) * 0.09, 2.2),
    pxbDeliveryConfidencePressure: normalizePressure(pxbDeliveryRaw, 2.2),
    carbonAdoptionAttackPressure: normalizePressure(Math.max(0, move("PXB-X")) * 0.12 + countActorTag("PXB-X", "resource_supply") * 0.55 + countActorTag("ANCHOR", "transport") * 0.75, 2.2),
    anchorTransportReliability: clamp(0.88 - normalizePressure(countActorTag("ANCHOR", "transport") + countActorTag("LUMEN", "blackout") * 0.55, 3.0, 0.72)),
    domusSettlementStress: normalizePressure(countActorTag("DOMUS", "habitat_failure") * 0.85 + countActorTag("OCI", "civilian_harm") * 0.42 + Math.max(0, move("OCI")) * 0.08, 2.5),
    lumenRelayStress: normalizePressure(countActorTag("LUMEN", "blackout") * 0.9 + countActorTag("LUMEN", "communications") * 0.5 + countActorTag("ANCHOR", "transport") * 0.35, 2.4),
    synopticSuppressionPressure: normalizePressure(countActorTag("SYNOPTIC", "data_suppression") * 0.9 + countActorTag("SYNOPTIC", "footage_leak") * 0.55 + countActorTag("EXEX", "legal_exposure") * 0.28, 2.4),
    marketRegime,
    activeStorylinePhase,
  };
};

const archetypes: EventArchetype[] = [
  {
    id: "exex-blanket-denial",
    actorId: "EXEX",
    action: "blanket_denial",
    category: "official_statement",
    source: "EXEX PUBLIC AFFAIRS",
    outputTags: ["extraction", "legal_exposure", "public_visibility", "denial"],
    baseSeverity: 48,
    cooldownCycles: 5,
    semanticPattern: "EXEX:blanket_denial",
    pressureDrivers: ["exexLegalPressure"],
    impactRules: { EXEX: -0.5, OCI: 0.4, OPSEC: 0.2 },
    institutionImpacts: { PSA: { publicTrust: -1 } },
    headlineTemplates: [
      "EXEX denies operational role in {cause}.",
      "EXEX repeats contractor-separation language after {cause}.",
      "EXEX says corridor activity remained outside direct operating control.",
      "EXEX counsel restates licensed-scope position as pressure builds.",
      "EXEX rejects liability read-through from {cause}.",
      "EXEX files limited no-comment response on contractor routing.",
      "EXEX describes corridor exposure as commercially ring-fenced.",
      "EXEX maintains separation language as disclosure requests widen.",
    ],
    bodyTemplates: [
      "The company cited licensed operating scope and commercial confidentiality while declining to discuss contractor telemetry.",
      "Counsel emphasized legacy permits and third-party operating boundaries without releasing routing records.",
      "The statement narrowed nothing operationally, but it kept the denial inside familiar legal language.",
      "Participants treated the signal as confirmation of the existing range rather than a clean resolution.",
      "The response left contractor routing unresolved while preserving the company's formal liability posture.",
      "Desks held prior assumptions: the denial reduced surprise, not legal pressure.",
    ],
    marketStateTemplates: ["Director allowed a denial only because EXEX legal pressure still needed a low-cost response."],
    targetIds: ["OPSEC", "PSA", "OCI"],
    publicReactionFamily: "denial-fatigue",
  },
  {
    id: "exex-partial-telemetry",
    actorId: "EXEX",
    action: "partial_telemetry_release",
    category: "official_statement",
    source: "EXEX PUBLIC AFFAIRS",
    outputTags: ["extraction", "legal_exposure", "public_visibility", "partial_admission"],
    baseSeverity: 55,
    cooldownCycles: 3,
    semanticPattern: "EXEX:partial_telemetry_release",
    pressureDrivers: ["exexLegalPressure", "exexDenialFatigue", "publicVisibilitySaturation"],
    pressureRelief: ["exexLegalPressure", "publicVisibilitySaturation"],
    impactRules: { EXEX: 0.7, SYNOPTIC: 0.3, OCI: -0.5, HALCYON: -0.2 },
    institutionImpacts: { UNICOL: { credibility: 1, signalAccess: 1 } },
    headlineTemplates: ["EXEX publishes partial corridor telemetry under counsel review.", "EXEX releases limited routing data after denial fatigue builds."],
    bodyTemplates: ["The release narrowed some operational questions while leaving contractor routing and civilian-access records unresolved."],
    marketStateTemplates: ["Director suppressed another blanket denial and selected controlled partial disclosure instead."],
    targetIds: ["SYNOPTIC", "UNICOL", "OCI"],
    publicReactionFamily: "evidence",
  },
  {
    id: "exex-investor-call",
    actorId: "EXEX",
    action: "investor_call",
    category: "official_statement",
    source: "EXEX PUBLIC AFFAIRS",
    outputTags: ["extraction", "legal_exposure", "resource_supply"],
    baseSeverity: 42,
    cooldownCycles: 3,
    semanticPattern: "EXEX:investor_call",
    pressureDrivers: ["exexLegalPressure", "pxbDeliveryConfidencePressure"],
    impactRules: { EXEX: 1.0, "PXB-X": 0.4, OPSEC: -0.2, OCI: -0.2 },
    institutionImpacts: { PSA: { credibility: -1 } },
    headlineTemplates: [
      "EXEX schedules investor call on corridor continuity and alternate routing.",
      "EXEX briefs holders on asset backing after {cause}.",
      "EXEX sets holder update on non-contested extraction capacity.",
      "EXEX frames corridor disruption as routing issue in investor notice.",
      "EXEX management prepares continuity call as legal questions remain open.",
      "EXEX points investors toward asset coverage and away from corridor liability.",
      "EXEX schedules capital-markets update after disclosure pressure narrows.",
      "EXEX says alternate routing remains available pending counsel review.",
    ],
    bodyTemplates: [
      "Management emphasized legacy licenses, asset coverage, and non-contested extraction routes without conceding corridor liability.",
      "The call focused on continuity math while keeping contractor exposure inside counsel-reviewed language.",
      "Investors were offered route diversity and asset backing, not a settlement of the underlying dispute.",
      "Risk remained priced but unresolved; desks treated the update as range maintenance.",
      "The tape narrowed rather than resolved as management separated throughput from liability.",
      "Participants no longer priced surprise, only duration and counsel-controlled disclosure.",
    ],
    marketStateTemplates: ["Director selected capital-markets reassurance rather than another public denial."],
    targetIds: ["PXB-X", "PSA", "OPSEC"],
  },
  {
    id: "opsec-contract-expansion",
    actorId: "OPSEC",
    action: "contract_expansion",
    category: "official_statement",
    source: "OPSEC STRATEGIC COMMUNICATIONS",
    outputTags: ["security_contract", "blackout", "communications"],
    baseSeverity: 46,
    cooldownCycles: 5,
    semanticPattern: "OPSEC:contract_expansion",
    pressureDrivers: ["lumenRelayStress", "pxbDeliveryConfidencePressure"],
    pressureIncrease: ["opsecProfitFromChaos"],
    impactRules: { OPSEC: 0.7, ACSB: 0.4, OCI: 0.25, EXEX: -0.35, "PXB-X": -0.25 },
    headlineTemplates: ["OPSEC expands continuity contracts after {cause}.", "OPSEC cites blackout resilience demand in new perimeter assurance work."],
    bodyTemplates: ["Procurement desks treated the announcement as demand for high-latency security continuity, but oversight risk remained visible."],
    marketStateTemplates: ["Director still permits OPSEC upside when infrastructure stress is fresh, but novelty rules limit repeated contract expansion."],
    targetIds: ["ACSB", "EXEX", "OCI"],
  },
  {
    id: "opsec-oversight-liability",
    actorId: "OPSEC",
    action: "oversight_liability",
    category: "official_statement",
    source: "INNER WORLDS MARKET FEED",
    outputTags: ["oversight", "legal_exposure", "security_contract", "civilian_harm"],
    baseSeverity: 61,
    cooldownCycles: 3,
    semanticPattern: "OPSEC:oversight_liability",
    pressureDrivers: ["opsecProfitFromChaos", "opsecLiabilityAccumulation", "publicVisibilitySaturation"],
    pressureRelief: ["opsecProfitFromChaos"],
    impactRules: { OPSEC: -1.0, ACSB: -0.4, HALCYON: 0.4, OCI: 0.4 },
    institutionImpacts: { UNICOL: { credibility: 1, publicTrust: 1 }, PSA: { credibility: 1 } },
    headlineTemplates: ["Oversight filing raises contractor-liability costs for OPSEC corridor work.", "OPSEC deniability spreads widen after MUTO-classification review."],
    bodyTemplates: ["Insurers priced repeated security-action ambiguity into contractor coverage as observers requested archived telemetry."],
    marketStateTemplates: ["Director converted repeated OPSEC crisis upside into liability accumulation."],
    targetIds: ["ACSB", "HALCYON", "OCI", "UNICOL"],
    publicReactionFamily: "contractor-liability",
  },
  {
    id: "opsec-muto-feed-leak",
    actorId: "OPSEC",
    action: "muto_feed_leak",
    category: "leak",
    source: "FREE COLONY WIRE",
    outputTags: ["oversight", "security_contract", "legal_exposure", "public_visibility"],
    baseSeverity: 76,
    cooldownCycles: 5,
    semanticPattern: "OPSEC:muto_feed_leak",
    pressureDrivers: ["opsecLiabilityAccumulation", "publicVisibilitySaturation"],
    impactRules: { OPSEC: -1.1, ACSB: -0.8, SYNOPTIC: 0.3, OCI: 0.6 },
    institutionImpacts: { UNICOL: { credibility: 1, publicTrust: 1 } },
    headlineTemplates: ["Leaked MUTO feed raises questions over OPSEC target classification.", "Public networks circulate OPSEC feed excerpt with classification gaps."],
    bodyTemplates: ["The clip did not change corridor control, but it made deniability more expensive across security suppliers."],
    marketStateTemplates: ["Director escalated contractor-liability pressure through evidence rather than another contract headline."],
    targetIds: ["ACSB", "SYNOPTIC", "UNICOL", "OCI"],
    publicReactionFamily: "evidence",
  },
  {
    id: "halcyon-fatality-delay",
    actorId: "HALCYON",
    action: "fatality_delay",
    category: "analyst_note",
    source: "HALCYON RISK DESK",
    outputTags: ["insurance", "civilian_harm", "legal_exposure"],
    baseSeverity: 64,
    cooldownCycles: 5,
    semanticPattern: "HALCYON:fatality_delay",
    pressureDrivers: ["ociOverheated", "lumenRelayStress"],
    impactRules: { HALCYON: 0.3, OCI: 0.5, SYNOPTIC: 0.1, DOMUS: -0.25, EXEX: -0.2 },
    institutionImpacts: { UNICOL: { publicTrust: -1 }, PSA: { publicTrust: -1 } },
    headlineTemplates: ["HALCYON delays fatality recognition pending signal confirmation.", "HALCYON extends exclusion review after {cause}."],
    bodyTemplates: ["Underwriters cited incomplete telemetry and flare interference as families remained outside the accounting event."],
    marketStateTemplates: ["Director permits delay language only when ambiguity pressure is still dominant."],
    targetIds: ["OCI", "UNICOL", "PSA"],
    publicReactionFamily: "insurance-cruelty",
  },
  {
    id: "halcyon-regulatory-half-life",
    actorId: "HALCYON",
    action: "regulatory_half_life",
    category: "analyst_note",
    source: "HALCYON RISK DESK",
    outputTags: ["insurance", "legal_exposure", "public_visibility"],
    baseSeverity: 60,
    cooldownCycles: 3,
    semanticPattern: "HALCYON:regulatory_half_life",
    pressureDrivers: ["halcyonDelayFatigue", "publicVisibilitySaturation"],
    pressureRelief: ["halcyonDelayFatigue"],
    impactRules: { HALCYON: -0.9, OCI: -0.2, DOMUS: 0.2 },
    institutionImpacts: { UNICOL: { publicTrust: 1 }, PSA: { publicTrust: 1 } },
    headlineTemplates: [
      "Regulatory review narrows HALCYON room on fatality-recognition delays.",
      "Class-action risk rises around HALCYON exclusion language.",
      "HALCYON delay language draws renewed policy-exclusion scrutiny.",
      "Underwriting desk cuts HALCYON benefit as recognition-delay risk matures.",
      "HALCYON faces review over unresolved casualty accounting.",
      "Fatality-recognition reserve benefit fades under regulatory pressure.",
      "HALCYON exclusion review shifts from reserve support to litigation cost.",
      "Insurers reprice HALCYON delay strategy as public visibility persists.",
    ],
    bodyTemplates: [
      "Repeated delay language began pricing as litigation exposure rather than underwriting discipline.",
      "The market no longer treated the delay as a clean reserve benefit; duration became the risk.",
      "Legal desks held prior assumptions while adding regulatory half-life to the trade.",
      "Risk remained priced but unresolved as policy language moved from discipline to exposure.",
      "Participants treated the signal as confirmation of the existing range, not a fresh shock.",
      "The tape narrowed rather than resolved as casualty accounting stayed outside final recognition.",
    ],
    marketStateTemplates: ["Director converted repeated delay semantics into HALCYON regulatory half-life."],
    targetIds: ["OCI", "UNICOL", "PSA"],
    publicReactionFamily: "insurance-cruelty",
  },
  {
    id: "domus-service-interruption",
    actorId: "DOMUS",
    action: "service_interruption",
    category: "breaking",
    source: "DOMUS SERVICE BULLETIN",
    outputTags: ["habitat_failure", "civilian_harm", "reconstruction", "insurance"],
    baseSeverity: 70,
    cooldownCycles: 4,
    semanticPattern: "DOMUS:service_interruption",
    pressureDrivers: ["domusSettlementStress", "lumenRelayStress"],
    pressureIncrease: ["domusSettlementStress"],
    impactRules: { DOMUS: -1.2, OCI: 0.7, HALCYON: 0.35, LUMEN: 0.05, EXEX: -0.2, "PXB-X": -0.15, ANCHOR: -0.1 },
    institutionImpacts: { PSA: { publicTrust: -2 } },
    headlineTemplates: ["DOMUS reports {resource} interruption in {location}.", "DOMUS reroutes settlement life-support service after {cause}."],
    bodyTemplates: ["Residents were instructed to remain inside registered structures while emergency procurement language stayed active."],
    marketStateTemplates: ["Director added settlement stress before allowing a later DOMUS stabilization valve."],
    targetIds: ["PSA", "HALCYON", "OCI"],
    locations: ["registered habitation cluster S-4", "civilian movement corridor"],
    publicReactionFamily: "subscription-life",
  },
  {
    id: "domus-verified-restoration",
    actorId: "DOMUS",
    action: "verified_restoration",
    category: "market_note",
    source: "DOMUS SERVICE BULLETIN",
    outputTags: ["habitat_failure", "reconstruction", "verified_access"],
    baseSeverity: 36,
    cooldownCycles: 3,
    semanticPattern: "DOMUS:verified_restoration",
    pressureDrivers: ["domusSettlementStress", "unicolOperationalCapacity", "psaCredibility"],
    pressureRelief: ["domusSettlementStress", "ociOverheated"],
    impactRules: { DOMUS: 1.2, OCI: -0.7, HALCYON: -0.3, LUMEN: 0.1 },
    institutionImpacts: { UNICOL: { credibility: 1, signalAccess: 1 }, PSA: { publicTrust: 2, operationalCapacity: 1 } },
    headlineTemplates: ["DOMUS restores {resource} under observer verification.", "DOMUS confirms shelter access restoration after {cause}."],
    bodyTemplates: ["Verified reconstruction reduced immediate settlement-risk premiums while preserving emergency procurement visibility."],
    marketStateTemplates: ["Director used DOMUS as a stabilization valve to cap ambiguity-driven OCI/HALCYON upside."],
    targetIds: ["UNICOL", "PSA", "OCI", "HALCYON"],
    locations: ["registered habitation cluster S-4", "civilian movement corridor"],
  },
  {
    id: "lumen-relay-stabilization",
    actorId: "LUMEN",
    action: "relay_stabilization",
    category: "market_note",
    source: "LUMEN RELAY NOTICE",
    outputTags: ["flare", "communications", "blackout"],
    baseSeverity: 33,
    cooldownCycles: 3,
    semanticPattern: "LUMEN:relay_stabilization",
    pressureDrivers: ["lumenRelayStress", "anchorTransportReliability"],
    pressureRelief: ["lumenRelayStress"],
    impactRules: { LUMEN: 0.8, OCI: -0.4, HALCYON: -0.2, SYNOPTIC: 0.2 },
    institutionImpacts: { UNICOL: { signalAccess: 2, operationalCapacity: 1 }, PSA: { signalAccess: 2 } },
    headlineTemplates: ["LUMEN relay stabilization succeeds through {location}.", "LUMEN observer route holds during latest flare window."],
    bodyTemplates: ["Priority and observer routes cleared after emergency routing, while civilian service tiers remained politically exposed."],
    marketStateTemplates: ["Director selected boring infrastructure stabilization after relay stress saturated."],
    targetIds: ["UNICOL", "PSA", "OCI"],
    locations: ["flare blackout window", "Outer Colony relay shelf"],
  },
  {
    id: "lumen-observer-bandwidth-failure",
    actorId: "LUMEN",
    action: "observer_bandwidth_failure",
    category: "breaking",
    source: "LUMEN RELAY NOTICE",
    outputTags: ["flare", "communications", "blackout", "public_visibility"],
    baseSeverity: 58,
    cooldownCycles: 4,
    semanticPattern: "LUMEN:observer_bandwidth_failure",
    pressureDrivers: ["lumenRelayStress", "publicVisibilitySaturation"],
    pressureIncrease: ["lumenRelayStress"],
    impactRules: { LUMEN: -0.9, OCI: 0.8, HALCYON: 0.5, DOMUS: -0.3 },
    institutionImpacts: { UNICOL: { signalAccess: -3, operationalCapacity: -1 }, PSA: { publicTrust: -1, signalAccess: -2 } },
    headlineTemplates: ["LUMEN observer channel degrades while commercial traffic clears.", "Priority relay pricing backlash follows observer bandwidth failure."],
    bodyTemplates: ["Emergency channels remained subordinate to paid routing queues during the affected relay window."],
    marketStateTemplates: ["Director made LUMEN failure about infrastructure incentives, not just flare weather."],
    targetIds: ["UNICOL", "PSA", "OCI", "HALCYON"],
    locations: ["Outer Colony relay shelf", "flare blackout window"],
    publicReactionFamily: "pricing",
  },
  {
    id: "synoptic-redacted-stills",
    actorId: "SYNOPTIC",
    action: "redacted_stills_release",
    category: "leak",
    source: "SYNOPTIC ACCESS DESK",
    outputTags: ["data_suppression", "footage_leak", "public_visibility"],
    baseSeverity: 54,
    cooldownCycles: 3,
    semanticPattern: "SYNOPTIC:redacted_stills_release",
    pressureDrivers: ["synopticSuppressionPressure", "publicVisibilitySaturation"],
    pressureRelief: ["synopticSuppressionPressure"],
    impactRules: { SYNOPTIC: 0.4, OCI: -0.1, EXEX: -0.3, HALCYON: 0.1 },
    institutionImpacts: { UNICOL: { signalAccess: 1 } },
    headlineTemplates: ["SYNOPTIC releases redacted corridor stills with chain-of-custody defense.", "SYNOPTIC archive note narrows imagery dispute without full release."],
    bodyTemplates: ["Verification desks treated the material as partial evidence control rather than full disclosure."],
    marketStateTemplates: ["Director avoided another withheld-imagery loop and chose controlled evidence release."],
    targetIds: ["EXEX", "UNICOL", "OCI"],
    publicReactionFamily: "evidence",
  },
  {
    id: "synoptic-archive-discrepancy",
    actorId: "SYNOPTIC",
    action: "archive_discrepancy",
    category: "leak",
    source: "FREE COLONY WIRE",
    outputTags: ["data_suppression", "footage_leak", "legal_exposure", "public_visibility"],
    baseSeverity: 72,
    cooldownCycles: 4,
    semanticPattern: "SYNOPTIC:archive_discrepancy",
    pressureDrivers: ["synopticSuppressionPressure", "exexLegalPressure"],
    impactRules: { SYNOPTIC: -1.0, EXEX: -0.5, OCI: 0.7, HALCYON: 0.3 },
    institutionImpacts: { UNICOL: { signalAccess: -1, credibility: 1 } },
    headlineTemplates: ["Independent leak contradicts SYNOPTIC archive timing.", "Archive discrepancy reopens corridor imagery chain-of-custody review."],
    bodyTemplates: ["Clients demanded paid verification access while public channels circulated mismatched thermal timestamps."],
    marketStateTemplates: ["Director escalated suppression pressure with contradiction instead of another access-withheld headline."],
    targetIds: ["EXEX", "UNICOL", "OCI"],
    publicReactionFamily: "evidence",
  },
  {
    id: "carbon-adoption-confidence-attack",
    actorId: "CARBON",
    action: "adoption_confidence_attack",
    category: "analyst_note",
    source: "HELLAS CAPITAL DESK",
    outputTags: ["fuel_competition", "safety_review", "resource_supply", "public_visibility"],
    baseSeverity: 48,
    cooldownCycles: 4,
    semanticPattern: "CARBON:adoption_confidence_attack",
    pressureDrivers: ["carbonAdoptionAttackPressure", "pxbDeliveryConfidencePressure"],
    pressureIncrease: ["pxbDeliveryConfidencePressure"],
    impactRules: { CARBON: 0.9, "PXB-X": -0.8, EXEX: -0.3, ANCHOR: -0.2 },
    headlineTemplates: ["Carbon Standard funds transfer-risk review after {cause}.", "Legacy fuel desks press safety language as Proxima shipments face delivery questions."],
    bodyTemplates: ["The review framed adoption speed as industrial-standardization risk rather than simple fuel competition."],
    marketStateTemplates: ["Director selected adoption-confidence pressure instead of repeating a generic Carbon warning."],
    targetIds: ["PXB-X", "EXEX", "ANCHOR"],
    locations: ["legacy fuel reserve desk", "Anchorpoint transfer lattice"],
  },
  {
    id: "anchor-cargo-window-delay",
    actorId: "ANCHOR",
    action: "cargo_window_delay",
    category: "breaking",
    source: "INNER WORLDS MARKET FEED",
    outputTags: ["transport", "logistics", "communications", "resource_supply"],
    baseSeverity: 58,
    cooldownCycles: 4,
    semanticPattern: "ANCHOR:cargo_window_delay",
    pressureDrivers: ["lumenRelayStress", "pxbScarcityPressure"],
    pressureIncrease: ["pxbDeliveryConfidencePressure"],
    impactRules: { ANCHOR: -1.0, "PXB-X": -0.8, EXEX: -0.4, HALCYON: 0.4, OCI: 0.4, LUMEN: -0.2 },
    headlineTemplates: [
      "Anchorpoint delays outbound cargo window after relay blackout.",
      "Anchorpoint hazard premiums rise as Proxima transfer window slips.",
      "Anchorpoint cargo desk rolls Proxima shipment window into next cycle.",
      "Transfer lattice congestion cuts delivery confidence for Proxima concentrate.",
      "Anchorpoint reports constrained outbound slot after {cause}.",
      "Cargo-window delay keeps scarcity bid but weakens delivery read-through.",
      "Anchorpoint route desk widens premiums as confirmation slips.",
      "Proxima transfer window narrows as logistics desks hold prior risk range.",
    ],
    bodyTemplates: [
      "Transport desks cut delivery confidence while scarcity remained visible in the forward curve.",
      "The market no longer priced surprise, only duration and cost of delay.",
      "Scarcity stayed in the tape, but route confidence fell harder through the session.",
      "Participants treated the signal as confirmation of the existing range rather than a new break.",
      "The cargo delay kept risk unresolved while reducing confidence in monetizable delivery.",
      "Desks held prior assumptions as logistics risk offset the underlying resource premium.",
    ],
    marketStateTemplates: ["Director made PXB-X fall on delivery confidence despite underlying scarcity pressure."],
    targetIds: ["LUMEN", "PXB-X", "EXEX", "HALCYON"],
    locations: ["Anchorpoint transfer lattice", "Proxima concentrate transfer station"],
  },
  {
    id: "anchor-alternate-route",
    actorId: "ANCHOR",
    action: "alternate_transfer_route",
    category: "market_note",
    source: "HELLAS CAPITAL DESK",
    outputTags: ["transport", "logistics", "resource_supply"],
    baseSeverity: 35,
    cooldownCycles: 3,
    semanticPattern: "ANCHOR:alternate_transfer_route",
    pressureDrivers: ["pxbDeliveryConfidencePressure", "anchorTransportReliability"],
    pressureRelief: ["pxbDeliveryConfidencePressure"],
    impactRules: { ANCHOR: 0.8, "PXB-X": 0.55, EXEX: 0.35, CARBON: -0.35, OCI: -0.2, HALCYON: -0.15 },
    headlineTemplates: [
      "Anchorpoint clears alternate transfer route for Proxima shipments.",
      "EXEX confirms constrained transfer slot through Anchorpoint capacity.",
      "Anchorpoint opens limited alternate route through transfer lattice.",
      "Proxima shipments receive conditional route diversity from Anchorpoint.",
      "Anchorpoint confirms partial cargo reroute after window pressure.",
      "Transfer desks mark constrained recovery in Proxima delivery confidence.",
      "Anchorpoint clears route capacity, with hazard pricing still attached.",
      "EXEX and Anchorpoint flag alternate slot without declaring corridor resolution.",
    ],
    bodyTemplates: [
      "Delivery confidence improved after route diversity partly repaired the cargo-window problem.",
      "The route update narrowed the tape rather than resolving the corridor dispute.",
      "Participants treated the signal as confirmation of the existing range: better delivery, unresolved risk.",
      "Desks kept hazard assumptions in place while acknowledging a cleaner transfer path.",
      "Risk remained priced but unresolved as the alternate route reduced only one part of the bottleneck.",
      "The market read the route as duration management, not a full recovery.",
    ],
    marketStateTemplates: ["Director let PXB-X scarcity premium dominate after transport reliability improved."],
    targetIds: ["PXB-X", "EXEX", "CARBON"],
    locations: ["Anchorpoint transfer lattice", "Proxima concentrate transfer station"],
  },
  {
    id: "unicol-verified-access",
    actorId: "UNICOL",
    action: "verified_access",
    category: "observer_update",
    source: "UNICOL OBSERVER MISSION",
    outputTags: ["unicol", "verified_access", "civilian_harm", "public_visibility"],
    baseSeverity: 42,
    cooldownCycles: 3,
    semanticPattern: "UNICOL:verified_access",
    pressureDrivers: ["unicolCredibility", "unicolOperationalCapacity", "ociOverheated"],
    pressureRelief: ["ociOverheated", "halcyonDelayFatigue"],
    impactRules: { OCI: -1.0, HALCYON: -0.4, EXEX: 0.3, OPSEC: -0.2 },
    institutionImpacts: { UNICOL: { credibility: 3, operationalCapacity: 3, signalAccess: 2 }, PSA: { publicTrust: 2 } },
    headlineTemplates: [
      "UNICOL access team verifies temporary civilian corridor clearance.",
      "UNICOL observers confirm limited access through {location}.",
      "UNICOL reports verified but narrow access window in Corridor 12-B.",
      "Observer team confirms partial civilian route clearance.",
      "UNICOL files access confirmation with movement limits still attached.",
      "UNICOL verification reduces ambiguity without changing enforcement posture.",
      "Observer access note narrows risk premium inside unresolved corridor dispute.",
      "UNICOL confirms corridor visibility while mandate limits remain evident.",
    ],
    bodyTemplates: [
      "Verified access reduced ambiguity around settlement risk and capped immediate insurance upside.",
      "The confirmation improved the evidentiary record without implying control of the corridor.",
      "Risk remained priced but unresolved; verification changed the tape, not the mandate.",
      "Participants treated the signal as confirmation of the existing range rather than recovery.",
      "The access note reduced ambiguity premiums while leaving enforcement capacity visibly separate.",
      "The market no longer priced surprise, only whether limited access could persist.",
    ],
    marketStateTemplates: ["Director used institutional capacity to reduce OCI/HALCYON ambiguity premium."],
    targetIds: ["OCI", "HALCYON", "PSA", "EXEX"],
    locations: ["civilian movement corridor", "Corridor 12-B"],
  },
  {
    id: "unicol-access-window-expired",
    actorId: "UNICOL",
    action: "access_window_expired",
    category: "observer_update",
    source: "UNICOL OBSERVER MISSION",
    outputTags: ["unicol", "civilian_harm", "communications"],
    baseSeverity: 46,
    cooldownCycles: 4,
    semanticPattern: "UNICOL:access_window_expired",
    pressureDrivers: ["unicolOperationalCapacity", "publicVisibilitySaturation", "lumenRelayStress"],
    pressureIncrease: ["ociOverheated"],
    impactRules: { OCI: 0.35, HALCYON: 0.15, SYNOPTIC: 0.05, EXEX: -0.25, DOMUS: -0.15 },
    institutionImpacts: { UNICOL: { operationalCapacity: -2, publicTrust: -1, mandateIntegrity: -1, signalAccess: -1 } },
    headlineTemplates: ["UNICOL access window expires before corridor verification.", "UNICOL observer team reports delayed access confirmation for {location}."],
    bodyTemplates: ["The mission retained documentary credibility, but failed to convert the notice into timely field verification."],
    marketStateTemplates: ["Director used a UNICOL counterweight so verified access cannot compound without operational setbacks."],
    targetIds: ["UNICOL", "OCI", "HALCYON", "SYNOPTIC"],
    locations: ["civilian movement corridor", "Corridor 12-B"],
  },
  {
    id: "psa-low-enforcement-directive",
    actorId: "PSA",
    action: "directive_low_enforcement",
    category: "psa_directive",
    source: "PSA EMERGENCY OFFICE",
    outputTags: ["psa", "legal_exposure", "civilian_harm"],
    baseSeverity: 34,
    cooldownCycles: 4,
    semanticPattern: "PSA:directive_low_enforcement",
    pressureDrivers: ["publicVisibilitySaturation"],
    impactRules: { EXEX: -0.3, DOMUS: -0.2, "PXB-X": -0.1, OCI: 0.2 },
    institutionImpacts: { PSA: { enforcementCapacity: -1, publicTrust: -1, latestStatement: "Emergency directive issued; enforcement remains limited." } },
    headlineTemplates: ["PSA issues emergency directive for {location}; enforcement remains limited.", "PSA requests temporary commercial halt inside disputed corridor."],
    bodyTemplates: ["The order added legal language but little near-term force while outside desks waited for verified access."],
    marketStateTemplates: ["Director kept PSA weak because credibility/enforcement pressure remains low."],
    targetIds: ["EXEX", "DOMUS", "PXB-X"],
    locations: ["Corridor 12-B", "civilian movement corridor"],
  },
  {
    id: "psa-licensing-objection",
    actorId: "PSA",
    action: "licensing_objection",
    category: "psa_directive",
    source: "PSA EMERGENCY OFFICE",
    outputTags: ["psa", "legal_exposure", "verified_access"],
    baseSeverity: 44,
    cooldownCycles: 4,
    semanticPattern: "PSA:licensing_objection",
    pressureDrivers: ["psaCredibility", "psaEnforcement", "unicolOperationalCapacity"],
    impactRules: { EXEX: -0.5, OPSEC: -0.3, "PXB-X": -0.2, OCI: -0.2 },
    institutionImpacts: { PSA: { credibility: 2, mandateIntegrity: 1, publicTrust: 1, recentDirective: "Licensing objection filed with verified-access evidence attached." } },
    headlineTemplates: ["PSA licensing objection gains weight after observer access review.", "PSA files corridor licensing challenge with verified-access attachment."],
    bodyTemplates: ["Directive language gained legal weight because outside observers could finally confirm parts of the corridor record."],
    marketStateTemplates: ["Director strengthened PSA legal weight without treating paperwork as real enforcement capacity."],
    targetIds: ["EXEX", "OPSEC", "PXB-X", "UNICOL"],
  },
  {
    id: "psa-unenforced-directive-expiry",
    actorId: "PSA",
    action: "unenforced_directive_expiry",
    category: "psa_directive",
    source: "PSA EMERGENCY OFFICE",
    outputTags: ["psa", "legal_exposure", "public_visibility"],
    baseSeverity: 38,
    cooldownCycles: 4,
    semanticPattern: "PSA:unenforced_directive_expiry",
    pressureDrivers: ["psaCredibility", "publicVisibilitySaturation"],
    pressureRelief: ["psaCredibility"],
    impactRules: { EXEX: 0.15, OPSEC: 0.05, OCI: 0.2, "PXB-X": -0.1, DOMUS: -0.1 },
    institutionImpacts: {
      PSA: {
        credibility: -1,
        publicTrust: -2,
        mandateIntegrity: -1,
        latestStatement: "Commercial halt request expired without confirmed compliance.",
      },
    },
    headlineTemplates: ["PSA commercial halt request expires without confirmed compliance.", "Contractor desks question PSA directive after no compliance notice follows."],
    bodyTemplates: ["The authority retained a legal filing trail, but the order did not produce visible field compliance."],
    marketStateTemplates: ["Director punished unenforced PSA directives without lowering enforcement capacity through hidden side effects."],
    targetIds: ["PSA", "EXEX", "OPSEC", "OCI"],
  },
  {
    id: "market-ambient-note",
    actorId: "OCI",
    action: "ambient_range_note",
    category: "market_note",
    source: "HELLAS CAPITAL DESK",
    outputTags: ["resource_supply", "insurance"],
    baseSeverity: 22,
    cooldownCycles: 2,
    semanticPattern: "MARKET:ambient_note",
    pressureDrivers: ["publicVisibilitySaturation", "pxbDeliveryConfidencePressure"],
    impactRules: { OCI: 0.02, "PXB-X": 0.08, EXEX: 0.01 },
    headlineTemplates: [
      "Markets hold prior risk range while desks wait for cleaner corridor data.",
      "Desks describe the tape as directionless pending a higher-conviction signal.",
      "Trading desks note a lack of fresh catalysts inside the current risk range.",
      "Risk desks keep Corridor 12-B pricing inside prior bands.",
      "The tape pauses as verification, transport, and liability signals offset.",
      "Participants treat new signals as confirmation of the existing range.",
      "The market no longer prices surprise, only duration.",
      "Desks hold prior assumptions as corridor risk remains unresolved.",
      "The tape narrows rather than resolves after offsetting corridor signals.",
      "Risk remains priced but unresolved in a low-conviction session.",
    ],
    bodyTemplates: [
      "No single disclosure changed the tape; desks treated the session as a pause between higher-conviction signals.",
      "Competing transport, verification, and legal signals left the market without a clean directional read.",
      "Risk desks held prior assumptions while waiting for stronger corridor evidence.",
      "The session drifted as stabilizing signals offset fresh legal and logistics pressure.",
      "Participants treated the latest signal as confirmation of the existing range, not as recovery.",
      "The market no longer priced surprise, only duration and unresolved administrative pressure.",
      "The tape narrowed rather than resolved as legal, transport, and verification inputs offset.",
      "Risk remained priced but unresolved while desks waited for a cleaner catalyst.",
    ],
    marketStateTemplates: ["Director used ambient fallback because all high-pressure candidates were low novelty."],
    targetIds: ["EXEX", "PXB-X", "HALCYON"],
  },
];

const pressureFor = (archetype: EventArchetype, pressures: DirectorPressureModel) => {
  const drivers = archetype.pressureDrivers.map((key) => pressures[key]);
  const base = drivers.reduce((sum, value) => sum + value, 0) / Math.max(drivers.length, 1);
  if (archetype.id === "exex-blanket-denial" && pressures.exexDenialFatigue > 0.45) return base * 0.25;
  if (archetype.id === "opsec-contract-expansion" && pressures.opsecProfitFromChaos > 0.55) return base * 0.35;
  if (archetype.id === "halcyon-fatality-delay" && pressures.halcyonDelayFatigue > 0.5) return base * 0.32;
  if (archetype.id === "psa-licensing-objection" && pressures.psaCredibility < 0.36) return base * 0.4;
  if (archetype.id === "psa-low-enforcement-directive" && pressures.psaCredibility > 0.45) return base * 0.45;
  if (archetype.id === "anchor-alternate-route" && pressures.anchorTransportReliability < 0.36) return base * 0.55;
  return base;
};

const scoreNovelty = (archetype: EventArchetype, recentEvents: MarketEvent[]) => {
  const recent = recentEvents.slice(0, 22);
  const samePattern = countWhere(recent, (event) => eventSemanticPattern(event) === archetype.semanticPattern);
  const sameActorAction = countWhere(recent, (event) => actorAction(event) === `${archetype.actorId}:${archetype.action}`);
  const primaryTags = archetype.outputTags.slice(0, 2);
  const tagCluster = countWhere(recent, (event) => primaryTags.every((tag) => event.tags.includes(tag)));
  const locationSet = new Set((archetype.locations ?? []).filter(Boolean));
  const sameLocation = locationSet.size
    ? countWhere(recent, (event) => {
        const location = locationFromEvent(event);
        return !!location && locationSet.has(location);
      })
    : 0;
  const repeatedBeneficiaries = Object.entries(archetype.impactRules).filter(
    ([id, impact]) => (impact ?? 0) > 0 && countWhere(recent, (event) => (event.impacts[id as MarketInstrumentId] ?? 0) > 0.1) >= 4,
  ).length;
  const sameReactionFamily = archetype.publicReactionFamily
    ? countWhere(recent, (event) => event.publicReactionFamily === archetype.publicReactionFamily)
    : 0;
  const score =
    1 -
    Math.min(0.55, samePattern * 0.32) -
    Math.min(0.36, sameActorAction * 0.2) -
    Math.min(0.3, tagCluster * 0.08) -
    Math.min(0.18, sameLocation * 0.08) -
    Math.min(0.18, repeatedBeneficiaries * 0.06) -
    Math.min(0.2, sameReactionFamily * 0.08);

  return {
    noveltyScore: clamp(Number(score.toFixed(2))),
    notes: [
      samePattern ? `suppressed same semantic pattern ${archetype.semanticPattern} (${samePattern})` : "",
      sameActorAction ? `penalized repeated actor/action ${archetype.actorId}:${archetype.action} (${sameActorAction})` : "",
      tagCluster >= 2 ? `tag cluster saturated: ${primaryTags.join("+")}` : "",
      sameLocation ? "location repetition penalty applied" : "",
      repeatedBeneficiaries ? "beneficiary pattern repeated recently" : "",
      sameReactionFamily ? `public phrase family repeated: ${archetype.publicReactionFamily}` : "",
    ].filter(Boolean),
  };
};

const chooseCandidate = (context: EventDirectorContext) => {
  const pressures = computeDirectorPressures(context);
  const intensityBoost = context.intensity === "high" ? 0.12 : context.intensity === "low" ? -0.08 : 0;
  const ambientStreak = countConsecutiveSemantic(context.recentEvents, "MARKET:ambient_note");
  const relaxedNoveltyFloor = ambientStreak >= 3 ? 0.18 : 0.45;
  const relaxedScoreFloor = ambientStreak >= 3 ? 0.12 : 0.18;
  const allCandidates: DirectorCandidate[] = archetypes
    .filter((archetype) => !archetype.allowedRegimes || archetype.allowedRegimes.includes(context.marketRegime))
    .map((archetype) => {
      const pressureScore = pressureFor(archetype, pressures);
      const { noveltyScore, notes } = scoreNovelty(archetype, context.recentEvents);
      const isAmbient = archetype.semanticPattern === "MARKET:ambient_note";
      const noveltyFloor = !isAmbient && ambientStreak >= 3 ? relaxedNoveltyFloor : 0.45;
      const semanticCooldownHit = countWhere(
        context.recentEvents.slice(0, archetype.cooldownCycles),
        (event) => eventSemanticPattern(event) === archetype.semanticPattern,
      );
      const actorActionCooldownHit = countWhere(
        context.recentEvents.slice(0, 4),
        (event) => actorAction(event) === `${archetype.actorId}:${archetype.action}`,
      );
      const publicFamilyCooldownHit = archetype.publicReactionFamily
        ? countWhere(context.recentEvents.slice(0, 6), (event) => event.publicReactionFamily === archetype.publicReactionFamily)
        : 0;
      const beneficiaryCooldownHit = Object.entries(archetype.impactRules).filter(
        ([id, impact]) =>
          (impact ?? 0) > 0 &&
          countWhere(context.recentEvents.slice(0, 5), (event) => (event.impacts[id as MarketInstrumentId] ?? 0) > 0.1) >= 3,
      ).length;
      const rejections = [
        noveltyScore < noveltyFloor ? `Rejected ${archetype.semanticPattern} due to low novelty score ${noveltyScore.toFixed(2)}.` : "",
        archetype.semanticPattern !== "MARKET:ambient_note" && semanticCooldownHit
          ? `Rejected ${archetype.semanticPattern} due to semantic cooldown.`
          : "",
        actorActionCooldownHit ? `Rejected ${archetype.semanticPattern} due to actor/action cooldown.` : "",
        publicFamilyCooldownHit >= 2 ? `Rejected ${archetype.semanticPattern} due to public reaction family cooldown.` : "",
        beneficiaryCooldownHit >= 2 ? `Rejected ${archetype.semanticPattern} due to repeated beneficiary pattern.` : "",
      ].filter(Boolean);
      const softGated = noveltyScore >= 0.45 && noveltyScore < 0.7;
      const score =
        pressureScore * 0.64 +
        noveltyScore * 0.42 +
        intensityBoost -
        semanticCooldownHit * 0.34 -
        actorActionCooldownHit * 0.24 -
        publicFamilyCooldownHit * 0.12 -
        beneficiaryCooldownHit * 0.1;
      return {
        archetype,
        noveltyScore,
        pressureScore,
        score: Number(score.toFixed(3)),
        notes,
        rejections: isAmbient && ambientStreak >= 2 ? [...rejections, `Ambient duplicate pressure active after ${ambientStreak} consecutive fallback notes.`] : rejections,
        softGated,
      };
    })
    .sort((a, b) => b.score - a.score);
  const normalCandidates = allCandidates.filter(
    (candidate) => candidate.noveltyScore >= 0.7 && candidate.rejections.length === 0 && candidate.score > 0.2,
  );
  const softCandidates = allCandidates.filter(
    (candidate) =>
      candidate.archetype.semanticPattern !== "MARKET:ambient_note" &&
      candidate.noveltyScore >= relaxedNoveltyFloor &&
      candidate.rejections.length === 0 &&
      candidate.score > relaxedScoreFloor,
  );
  const ambientFallback = allCandidates.find((candidate) => candidate.archetype.semanticPattern === "MARKET:ambient_note");
  const top = (normalCandidates.length ? normalCandidates : softCandidates.length ? softCandidates : ambientFallback ? [{ ...ambientFallback, forcedFallback: true }] : []).slice(0, 5);
  if (!top.length) return null;
  const weighted = top.flatMap((candidate, index) => Array(Math.max(1, top.length - index)).fill(candidate) as DirectorCandidate[]);
  const selected = choice(weighted);
  const suppressed = allCandidates
    .filter((candidate) => candidate.rejections.length > 0 && candidate.archetype.semanticPattern !== selected.archetype.semanticPattern)
    .slice(0, 8);
  return { selected, pressures, suppressed, ambientStreak };
};

const publicReactions: Record<string, string[]> = {
  "denial-fatigue": [
    "EXEX found another way to say nothing with counsel present.",
    "Denial number six has a different letterhead.",
    "Counsel changed the sentence order and called it new disclosure.",
    "If the answer were simple, it would not need this many licensed nouns.",
    "The denial did not remove the risk. It organized it.",
    "Another statement where every useful verb has legal review attached.",
  ],
  evidence: [
    "Funny how the archive becomes partial right after the leak becomes public.",
    "Every redaction is apparently load-bearing.",
    "Chain of custody is doing the work that truth used to do.",
    "The archive became cleaner exactly when it became expensive.",
    "Verification is available, just not in the free version of reality.",
  ],
  "contractor-liability": [
    "OPSEC monetized the gap between law and violence until the invoice came back.",
    "Continuity contract, discontinuity bodies.",
    "Everyone wants perimeter assurance until the perimeter has witnesses.",
    "Contractor separation is a business model until discovery starts.",
    "Security demand is still real. So is the liability.",
  ],
  "insurance-cruelty": [
    "The market found a way to make missing people an accounting category again.",
    "Recognition delayed, premiums recognized immediately.",
    "The body count has a settlement date now.",
    "Underwriting discipline is what they call waiting for families to become paperwork.",
    "Delay is not uncertainty when it always pays the same desk first.",
  ],
  "subscription-life": [
    "Life as subscription, reconstruction as upgrade path.",
    "Water restored under observer verification is a sentence that should not exist.",
    "The service notice says restored. The line outside says conditional.",
    "Habitat access now has better documentation than reliability.",
    "Emergency procurement is apparently the afterlife of broken infrastructure.",
  ],
  pricing: [
    "Emergency bandwidth still has a premium tier.",
    "They cleared commercial traffic first and called it resilience.",
    "The observer channel failed after the paid route cleared, somehow.",
    "Crisis pricing is just rationing with a billing department.",
    "Relay access has become a market signal and a moral inventory.",
  ],
};

const causeFor = (archetype: EventArchetype, pressures: DirectorPressureModel) => {
  if (archetype.outputTags.includes("transport")) return "cargo-window delay";
  if (archetype.outputTags.includes("communications")) return "relay-window failure";
  if (archetype.outputTags.includes("safety_review")) return "Anchorpoint cargo-window delay";
  if (archetype.outputTags.includes("habitat_failure")) return "settlement service interruption";
  if (archetype.outputTags.includes("data_suppression")) return "imagery chain-of-custody dispute";
  if (pressures.publicVisibilitySaturation > 0.55) return "public visibility saturation";
  return "Corridor 12-B disclosure pressure";
};

const resourceFor = (tags: EventTag[]) => {
  if (tags.includes("habitat_failure")) return choice(["water-loop access", "oxygen-loop access", "shelter access"]);
  if (tags.includes("transport")) return "Proxima concentrate shipments";
  if (tags.includes("communications")) return "observer bandwidth";
  if (tags.includes("safety_review")) return "PX concentrate adoption";
  return "corridor telemetry";
};

const phaseFor = (tags: EventTag[], category: EventCategory) => {
  if (tags.includes("verified_access") || tags.includes("reconstruction")) return "Verification / Stabilization";
  if (tags.includes("oversight") || tags.includes("legal_exposure") || category === "PSA Directive") return "Licensing Objection / Legal Review";
  if (tags.includes("transport") || tags.includes("resource_supply")) return "Delivery Confidence / Resource Pricing";
  if (tags.includes("data_suppression") || tags.includes("footage_leak")) return "Evidence Control / Verification";
  if (tags.includes("communications")) return "Relay Infrastructure / Signal Access";
  return "Corridor 12-B Market Pressure";
};

const renderTemplate = (template: string, slots: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? "");

const severityFor = (baseSeverity: number, intensity: NewsIntensity, pressureScore: number) => {
  const adjusted =
    baseSeverity +
    pressureScore * 18 +
    (intensity === "high" ? 8 : intensity === "low" ? -8 : 0) +
    (Math.random() - 0.5) * 8;
  const numeric = Math.round(Math.max(8, Math.min(98, adjusted)));
  const eventSeverity: MarketEvent["severity"] = numeric >= 74 ? "material" : numeric >= 45 ? "warning" : "notice";
  return { numeric, eventSeverity };
};

const compactImpacts = (impacts: Partial<Record<MarketInstrumentId, number>>) =>
  Object.entries(impacts)
    .filter(([, value]) => Math.abs(value ?? 0) >= 0.1)
    .slice(0, 4)
    .map(([id, value]) => `${getMarketInstrument(id as MarketInstrumentId).symbol} ${value! >= 0 ? "+" : ""}${value!.toFixed(1)}%`)
    .join(", ");

const ambientImpactJitter = (id: MarketInstrumentId, value: number) => {
  const jitter = (Math.random() - 0.5) * 0.1;
  const next = value + jitter;
  const caps: Partial<Record<MarketInstrumentId, [number, number]>> = {
    OCI: [-0.03, 0.05],
    "PXB-X": [0.03, 0.13],
    EXEX: [-0.03, 0.04],
  };
  const [min, max] = caps[id] ?? [-0.05, 0.05];
  return Number(Math.max(min, Math.min(max, next)).toFixed(2));
};

const topPressureLines = (pressures: DirectorPressureModel) =>
  (Object.entries(pressures) as Array<[keyof DirectorPressureModel, number | string]>)
    .filter((entry): entry is [PressureKey, number] => typeof entry[1] === "number")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, value]) => `${key} ${Math.round(value * 100)}%`);

export const createDirectedMarketEvent = (context: EventDirectorContext): MarketEvent | null => {
  const result = chooseCandidate(context);
  if (!result) return null;

  const { selected, pressures, suppressed, ambientStreak } = result;
  const { archetype } = selected;
  const pressureScore = pressureFor(archetype, pressures);
  const { numeric, eventSeverity } = severityFor(archetype.baseSeverity, context.intensity, pressureScore);
  const cause = causeFor(archetype, pressures);
  const location = choice(archetype.locations?.length ? archetype.locations : places);
  const publicReactionFamily = archetype.publicReactionFamily;
  const recentFamilyCount = publicReactionFamily
    ? countWhere(context.recentEvents.slice(0, 12), (event) => event.publicReactionFamily === publicReactionFamily)
    : 0;
  const publicReactionCandidate =
    publicReactionFamily && recentFamilyCount < 2 && numeric >= 54 ? choice(publicReactions[publicReactionFamily] ?? []) : undefined;
  const slots = {
    actorDisplayName: entityLabel(archetype.actorId),
    actor: isMarketId(archetype.actorId) ? archetype.actorId : archetype.actorId,
    targetDisplayName: archetype.targetIds.map(entityLabel).slice(0, 2).join(" and "),
    locationName: location,
    location,
    causePhrase: cause,
    cause,
    phasePhrase: phaseFor(archetype.outputTags, categoryMap[archetype.category]),
    marketPhrase: compactImpacts(archetype.impactRules) || "limited immediate price action",
    legalPhrase: "commercial confidentiality and contractor separation",
    transportPhrase: archetype.outputTags.includes("transport") ? "transfer capacity and hazard premiums" : "corridor routing",
    evidencePhrase: archetype.outputTags.includes("data_suppression") ? "redacted stills and archive timing" : "partial telemetry",
    publicPhrase: publicReactionCandidate ?? "public channels kept repeating the phrase without moving the tape",
    resource: resourceFor(archetype.outputTags),
  };
  const headline = renderTemplate(choice(archetype.headlineTemplates), slots);
  const summary = renderTemplate(choice(archetype.bodyTemplates), slots);
  const marketStateNote = renderTemplate(choice(archetype.marketStateTemplates ?? [archetype.semanticPattern]), slots);
  const impactScale = selected.forcedFallback ? 0.35 : selected.softGated ? 0.62 : 1;
  const adjustedImpacts = Object.fromEntries(
    Object.entries(archetype.impactRules).map(([id, value]) => {
      const scaled = Number(((value ?? 0) * impactScale).toFixed(2));
      return [
        id,
        archetype.semanticPattern === "MARKET:ambient_note"
          ? ambientImpactJitter(id as MarketInstrumentId, scaled)
          : scaled,
      ];
    }),
  ) as Partial<Record<MarketInstrumentId, number>>;
  const rejectionNotes = suppressed.flatMap((candidate) => candidate.rejections).slice(0, 4);
  const directorNotes = [
    `Director selected ${archetype.semanticPattern} from top pressures: ${topPressureLines(pressures).join(", ")}.`,
    ...rejectionNotes,
    rejectionNotes.length ? `Selected alternate ${archetype.semanticPattern}.` : "",
    selected.softGated ? `Selected ${archetype.semanticPattern} as a reduced-impact soft-gated candidate at novelty ${selected.noveltyScore.toFixed(2)}.` : "",
    selected.forcedFallback ? "Director used ambient fallback because all high-pressure candidates were low novelty." : "",
    ambientStreak >= 2 ? `Ambient fallback streak before selection: ${ambientStreak}.` : "",
    ...selected.notes.map((note) => `Novelty: ${note}.`),
    marketStateNote,
  ].filter(Boolean);
  const involvedActors = Array.from(new Set([archetype.actorId, ...archetype.targetIds])).filter(
    (id): id is MarketInstrumentId | InstitutionId => isMarketId(id) || isInstitutionId(id),
  );
  const timestamp = Date.now();

  return {
    id: `director-${archetype.id}-${timestamp}-${Math.floor(Math.random() * 1000)}`,
    templateId: archetype.id,
    category: categoryMap[archetype.category],
    tags: archetype.outputTags,
    headline,
    summary,
    involvedActors,
    impacts: adjustedImpacts,
    institutionImpacts: archetype.institutionImpacts ?? {},
    mediaSnippet: `${summary}${compactImpacts(adjustedImpacts) ? ` ${compactImpacts(adjustedImpacts)}.` : ""}`,
    publicReaction: publicReactionCandidate,
    publicReactionFamily,
    severity: eventSeverity,
    source: archetype.source,
    timestamp,
    generated: true,
    storylineId: "corridor-12b-licensing-dispute",
    phase: phaseFor(archetype.outputTags, categoryMap[archetype.category]),
    semanticPattern: archetype.semanticPattern,
    noveltyScore: selected.noveltyScore,
    marketStateNote,
    directorNotes,
  };
};

export const summarizeDirectorSession = ({
  market,
  institutionsState,
  events,
  marketRegime,
  activeStorylinePhase,
  debug = false,
}: {
  market: MarketState;
  institutionsState: InstitutionState;
  events: MarketEvent[];
  marketRegime: MarketRegime;
  activeStorylinePhase: string;
  debug?: boolean;
}) => {
  const pressures = computeDirectorPressures({ market, institutionsState, recentEvents: events, marketRegime, activeStorylinePhase });
  const recentDirected = events.filter((event) => event.semanticPattern).slice(0, 24);
  const semanticCounts = new Map<string, number>();
  const suppressed = new Set<string>();
  for (const event of events.slice(0, 30)) {
    const pattern = eventSemanticPattern(event);
    semanticCounts.set(pattern, (semanticCounts.get(pattern) ?? 0) + 1);
    if ((event.noveltyScore ?? 1) < 0.45) suppressed.add(pattern);
  }
  const saturated = [...semanticCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topPressures = topPressureLines(pressures);
  const latest = recentDirected[0];
  const ambientStreak = countConsecutiveSemantic(events, "MARKET:ambient_note");
  const ambientDuplicateRejections = events
    .flatMap((event) => event.directorNotes ?? [])
    .filter((note) => note.includes("Ambient duplicate pressure active")).length;
  const institutionMetricLines = institutions
    .map((institution) => {
      const current = institutionsState[institution.id];
      return `${institution.id} credibility ${Math.round(current.credibility)}%, operational ${Math.round(current.operationalCapacity)}%, enforcement ${Math.round(current.enforcementCapacity)}%, trust ${Math.round(current.publicTrust)}%`;
    })
    .join("; ");
  const stabilizers = countWhere(events.slice(0, 12), (event) => event.tags.includes("verified_access") || event.tags.includes("reconstruction"));
  const acutePressure = Math.max(pressures.exexLegalPressure, pressures.publicVisibilitySaturation, pressures.opsecLiabilityAccumulation, pressures.ociOverheated);
  const posture =
    marketRegime === "PANIC" || marketRegime === "RISK_OFF"
      ? "degrading"
      : marketRegime === "RECOVERY" && stabilizers >= 2
        ? acutePressure > 0.72
          ? "mixed"
          : "stabilizing"
      : marketRegime === "MARKET_VOLATILITY" && acutePressure > 0.58
        ? "escalating"
        : marketRegime === "DEGRADED_STABILITY" || marketRegime === "POST_CRISIS_PLATEAU" || marketRegime === "MANAGED_PLATEAU"
            ? acutePressure > 0.68
              ? "mixed"
              : "plateauing"
            : acutePressure > 0.68 && stabilizers > 0
              ? "mixed"
              : acutePressure > 0.68
                ? "escalating"
                : "plateauing";
  const nextLikely = archetypes
    .map((archetype) => ({ archetype, score: pressureFor(archetype, pressures) + scoreNovelty(archetype, events).noveltyScore * 0.35 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ archetype }) => archetype.semanticPattern);
  const rejectedPatterns = events
    .flatMap((event) => event.directorNotes ?? [])
    .map((note) => note.match(/^Rejected ([^ ]+) due to/)?.[1])
    .filter((pattern): pattern is string => !!pattern);
  const suppressedPatterns = Array.from(new Set([...rejectedPatterns, ...[...suppressed]])).slice(0, 5);

  const cleanNotes = [
    `Current market regime: ${marketRegime}.`,
    `Session posture: ${posture}.`,
    `Chosen dominant narrative pressure: ${latest?.semanticPattern ?? topPressures[0] ?? "ambient market pressure"}.`,
    `Suppressed repeated patterns: ${suppressedPatterns.join(", ") || "none currently"}.`,
    `Next likely event families: ${nextLikely.join(", ") || "legacy generator fallback"}.`,
  ];

  if (!debug) return cleanNotes;

  return [
    ...cleanNotes,
    `Top pressure signals: ${topPressures.join(", ") || "none"}.`,
    `Most saturated semantic patterns: ${saturated.map(([pattern, count]) => `${pattern} (${count})`).join(", ") || "none"}.`,
    `Institution damping active: positive deltas taper near 100, non-enforcement metrics drift toward baselines, enforcement changes only on explicit enforcement impacts.`,
    `Top institution metrics after damping: ${institutionMetricLines}.`,
    `Ambient fallback streak: ${ambientStreak}; rejected ambient duplicates noted: ${ambientDuplicateRejections}.`,
    latest?.directorNotes?.[0] ?? "Director has not generated a recent event in this session window.",
  ];
};
