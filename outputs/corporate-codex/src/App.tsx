import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentViewer } from "./components/DocumentViewer";
import { EventImpactChips } from "./components/EventImpactChips";
import { InstitutionsView } from "./components/InstitutionsView";
import { MarketDashboard } from "./components/MarketDashboard";
import { MarketDetail } from "./components/MarketDetail";
import { MediaFeed } from "./components/MediaFeed";
import { codexDocuments, type CodexDocumentId } from "./data/documents";
import {
  institutions,
  marketInstruments,
  type Institution,
  type InstitutionId,
  type MarketInstrumentId,
} from "./data/entities";
import { eventTemplates, type EventTag, type InstitutionImpact, type MarketEvent } from "./data/events";
import { socialAccounts, type SocialPersonaType } from "./data/socialAccounts";
import { socialTemplates, type SocialSentiment } from "./data/socialTemplates";
import { storylineLanes, summarizeStorylineLanes } from "./data/storylineLanes";
import { deriveActiveWorldStateModifier, worldStateModifiers } from "./data/worldStateModifiers";
import {
  applyMeanReversion,
  activeStoryline,
  classifyMarketRegime,
  classifyMarketStatus,
  createCircuitBreakerEvent,
  createHistoryPoint,
  createRecoveryEvent,
  exportSessionMarkdown,
  floorValueFor,
  isAbnormalMarketStatus,
  pricedInMultiplier,
  regimeDescription,
  rememberEventTags,
  shouldGenerateRecovery,
  systemicSupportFor,
  type EventMemory,
  type MarketExportMode,
  type MarketHistoryPoint,
  type MarketRegime,
  type MarketStatus,
} from "./lib/marketModel";
import { generateDirectedMarketEvent, generateMarketEvent, generatePublicReactionEvent, type NewsIntensity } from "./lib/newsEngine";
import { generateSocialPostsForEvent, type SocialPost } from "./sim/socialEngine";

export type MarketPoint = {
  value: number;
  previousClose: number;
  history: MarketHistoryPoint[];
  headline: string;
  eventBias: number;
  recentEventIds: string[];
  marketStatus: MarketStatus;
  haltUntil?: number;
  lastStatusEventAt?: number;
  distressScore: number;
};

export type MarketState = Record<MarketInstrumentId, MarketPoint>;
export type InstitutionState = Record<InstitutionId, Institution>;

const createInitialMarketState = (): MarketState =>
  Object.fromEntries(
    marketInstruments.map((instrument) => {
      const previousClose = instrument.basePrice * (1 - instrument.initialTrend / 100);
      const timestampBase = Date.now() - 58 * 2200;
      const values = Array.from({ length: 58 }, (_, index) => {
        const wave = Math.sin(index / 4.6) * instrument.volatility * 1.2;
        const drift = (index - 29) * instrument.trendBias * 0.05;
        return Number((instrument.basePrice * (1 + (wave + drift - instrument.initialTrend) / 100)).toFixed(2));
      });
      const historyValues = [...values.slice(0, -1), instrument.basePrice];
      const history = historyValues.map((value, index) =>
        createHistoryPoint({
          entityId: instrument.id,
          value,
          previousValue: index === 0 ? previousClose : historyValues[index - 1],
          eventIds: [],
          causeType: "ambient",
          note: "Opening market baseline.",
          timestamp: timestampBase + index * 2200,
        }),
      );

      return [
        instrument.id,
        {
        value: instrument.basePrice,
        previousClose,
        history,
        headline: instrument.headlines[0],
        eventBias: 0,
        recentEventIds: [],
        marketStatus: "NORMAL",
        distressScore: 0,
        },
      ];
    }),
  ) as unknown as MarketState;

const createInitialInstitutionState = (): InstitutionState =>
  Object.fromEntries(institutions.map((institution) => [institution.id, { ...institution }])) as InstitutionState;

const clamp = (value: number, min: number, max = Number.POSITIVE_INFINITY) => Math.min(Math.max(value, min), max);
const clampMetric = (value: number) => clamp(value, 0, 100);
const cloneImpacts = (event: MarketEvent) => ({ ...event.impacts });
const countMemory = (memory: EventMemory, actor: string, tags: string[]) =>
  tags.reduce((sum, tag) => sum + (memory[`${actor}:${tag}`] ?? 0), 0);

type InstitutionMetricKey =
  | "credibility"
  | "operationalCapacity"
  | "enforcementCapacity"
  | "mandateIntegrity"
  | "publicTrust"
  | "signalAccess";

const institutionMetricBaselines: Record<InstitutionId, Record<InstitutionMetricKey, number>> = {
  UNICOL: {
    credibility: 45,
    operationalCapacity: 20,
    enforcementCapacity: 11,
    mandateIntegrity: 45,
    publicTrust: 20,
    signalAccess: 25,
  },
  PSA: {
    credibility: 25,
    operationalCapacity: 20,
    enforcementCapacity: 0,
    mandateIntegrity: 35,
    publicTrust: 15,
    signalAccess: 20,
  },
};

const hasMetric = (impact: InstitutionImpact, metric: InstitutionMetricKey) =>
  Object.prototype.hasOwnProperty.call(impact, metric);

const applyInstitutionDelta = (
  current: number,
  delta: number,
  baseline: number,
  options?: {
    gainDamping?: number;
    lossDamping?: number;
    driftRate?: number;
  },
) => {
  const safeBaseline = Math.max(1, baseline);
  const gain = delta > 0 ? delta * (options?.gainDamping ?? 1) * (1 - current / 100) : 0;
  const loss = delta < 0 ? delta * (options?.lossDamping ?? 1) * Math.max(0.5, current / safeBaseline) : 0;
  const drift = (baseline - current) * (options?.driftRate ?? 0.01);
  return clampMetric(current + gain + loss + drift);
};

const applyInstitutionImpact = (
  current: Institution,
  institutionId: InstitutionId,
  impact: InstitutionImpact = {},
) => {
  const baseline = institutionMetricBaselines[institutionId];
  const metric = (key: InstitutionMetricKey) =>
    applyInstitutionDelta(current[key], impact[key] ?? 0, baseline[key]);
  const enforcementCapacity = hasMetric(impact, "enforcementCapacity")
    ? applyInstitutionDelta(current.enforcementCapacity, impact.enforcementCapacity ?? 0, baseline.enforcementCapacity, {
        gainDamping: 0.45,
        lossDamping: 0.85,
        driftRate: 0.004,
      })
    : current.enforcementCapacity;

  return {
    ...current,
    credibility: metric("credibility"),
    operationalCapacity: metric("operationalCapacity"),
    enforcementCapacity,
    mandateIntegrity: metric("mandateIntegrity"),
    publicTrust: metric("publicTrust"),
    signalAccess: metric("signalAccess"),
    latestStatement: impact.latestStatement ?? current.latestStatement,
    recentDirective: impact.recentDirective ?? current.recentDirective,
    currentStatus: impact.currentStatus ?? current.currentStatus,
  };
};

const formatSimulatedLabel = (minutes: number) => {
  const cycle = Math.floor(minutes / 1440);
  const dayMinutes = Math.floor(minutes % 1440);
  const hour = Math.floor(dayMinutes / 60);
  const minute = dayMinutes % 60;
  return `Cycle ${cycle}.${Math.floor((dayMinutes / 1440) * 10)} / ${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

type DraftKind = "news" | "pulse" | "modifier";

type LocalWorldPressureTest = {
  id: string;
  title: string;
  summary: string;
  affectedLanes: string[];
  boostedSemanticPatterns: string[];
  suppressedSemanticPatterns: string[];
  boostedTags: string[];
  remainingEvents: number;
};

type ContentDraft = {
  kind: DraftKind;
  semanticPattern: string;
  headline: string;
  body: string;
  marketStateNote: string;
  laneContext: string;
  worldModifierContext: string;
  reactionFamily: string;
  personaType: string;
  pulseText: string;
  toneSentiment: string;
  tags: string;
  relatedActors: string;
  modifierTitle: string;
  modifierSummary: string;
  affectedLanes: string;
  boostedSemanticPatterns: string;
  suppressedSemanticPatterns: string;
  boostedTags: string;
};

const emptyContentDraft: ContentDraft = {
  kind: "news",
  semanticPattern: "",
  headline: "",
  body: "",
  marketStateNote: "",
  laneContext: "",
  worldModifierContext: "",
  reactionFamily: "",
  personaType: "",
  pulseText: "",
  toneSentiment: "",
  tags: "",
  relatedActors: "",
  modifierTitle: "",
  modifierSummary: "",
  affectedLanes: "",
  boostedSemanticPatterns: "",
  suppressedSemanticPatterns: "",
  boostedTags: "",
};

const listFromDraft = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueStrings = (values: Array<string | undefined>) => Array.from(new Set(values.filter((value): value is string => !!value))).sort();

const operatorSemanticPatterns = uniqueStrings([
  ...eventTemplates.flatMap((event) => [event.semanticPattern, event.templateId]),
  ...storylineLanes.flatMap((lane) => lane.relatedPatterns),
  ...worldStateModifiers.flatMap((modifier) => [
    ...modifier.activationPatterns,
    ...modifier.boostedSemanticPatterns,
    ...modifier.suppressedSemanticPatterns,
  ]),
  ...socialTemplates.flatMap((template) => template.semanticPatterns ?? []),
  "MARKET:ambient_note",
]);

const operatorLaneOptions = storylineLanes.map((lane) => ({ value: lane.title, label: lane.title, hint: lane.focus, id: lane.id }));
const operatorLaneIdOptions = storylineLanes.map((lane) => ({ value: lane.id, label: `${lane.title} (${lane.id})` }));
const operatorWorldPressureOptions = worldStateModifiers.map((modifier) => ({
  value: modifier.title,
  label: modifier.title,
  hint: modifier.summary,
  id: modifier.id,
}));
const operatorReactionFamilies = uniqueStrings([
  ...socialTemplates.map((template) => template.family),
  ...storylineLanes.flatMap((lane) => lane.reactionFamilies ?? []),
]);
const operatorPersonaOptions = uniqueStrings([
  ...socialAccounts.map((account) => account.personaType),
  ...socialTemplates.flatMap((template) => template.personaTypes ?? []),
]);
const operatorToneOptions = uniqueStrings([
  ...socialAccounts.map((account) => account.tone),
  ...socialTemplates.flatMap((template) => [...(template.tones ?? []), template.sentiment]),
]);
const operatorTagOptions = uniqueStrings([
  ...eventTemplates.flatMap((event) => event.tags),
  ...storylineLanes.flatMap((lane) => lane.relatedTags),
  ...worldStateModifiers.flatMap((modifier) => [...modifier.activationTags, ...modifier.boostedTags]),
  ...socialTemplates.flatMap((template) => template.tags),
]);
const operatorActorOptions = uniqueStrings([...marketInstruments.map((instrument) => instrument.id), ...institutions.map((institution) => institution.id)]);
const eventTagSet = new Set(operatorTagOptions);
const entityIdSet = new Set(operatorActorOptions);
const marketInstrumentIdSet = new Set<string>(marketInstruments.map((instrument) => instrument.id));
const socialSentiments: SocialSentiment[] = ["supportive", "critical", "fearful", "cynical", "bullish", "bearish", "polarizing", "neutral"];
const socialPersonaTypes: SocialPersonaType[] = [
  "settler",
  "investor",
  "contractor",
  "analyst",
  "institutional",
  "psa_local",
  "exex_holder",
  "opsec_supporter",
  "anti_corporate",
  "carbon_aligned",
  "logistics",
  "industrial_worker",
  "bot_or_promoted",
];

const isEventTag = (value: string): value is EventTag => eventTagSet.has(value);
const isMarketInstrumentId = (value: string): value is MarketInstrumentId => marketInstrumentIdSet.has(value);
const isEntityId = (value: string): value is MarketInstrumentId | InstitutionId => entityIdSet.has(value);
const sentimentFromDraft = (value: string): SocialSentiment =>
  socialSentiments.includes(value as SocialSentiment) ? (value as SocialSentiment) : "neutral";
const personaFromDraft = (value: string): SocialPersonaType =>
  socialPersonaTypes.includes(value as SocialPersonaType) ? (value as SocialPersonaType) : "analyst";
const tagsFromDraft = (draft: ContentDraft) => listFromDraft(draft.tags).filter(isEventTag);
const actorsFromDraft = (draft: ContentDraft) => {
  const listed = listFromDraft(draft.relatedActors).filter(isEntityId);
  const prefix = draft.semanticPattern.split(":")[0];
  const inferred = isEntityId(prefix) ? [prefix] : [];
  return Array.from(new Set([...listed, ...inferred]));
};

const loadContentDraft = (): ContentDraft => {
  if (typeof window === "undefined") return emptyContentDraft;
  try {
    const saved = window.localStorage.getItem("corporate-content-draft");
    return saved ? { ...emptyContentDraft, ...JSON.parse(saved) } : emptyContentDraft;
  } catch {
    return emptyContentDraft;
  }
};

const simulatedSpacingFor = (event: MarketEvent | null, regime: MarketRegime) => {
  if (!event) return 4 + Math.floor(Math.random() * 8);
  const severityBase = event.severity === "material" ? 48 : event.severity === "warning" ? 22 : 9;
  const regimeBase =
    regime === "PANIC"
      ? 18
      : regime === "DEGRADED_STABILITY" || regime === "POST_CRISIS_PLATEAU" || regime === "MANAGED_PLATEAU"
        ? 34
        : 0;
  const categoryBase = event.category === "Public Reaction" ? 6 : event.category === "Market Note" ? -4 : 0;
  return Math.max(4, severityBase + regimeBase + categoryBase + Math.floor(Math.random() * 18));
};

function App() {
  const [market, setMarket] = useState<MarketState>(createInitialMarketState);
  const [institutionsState, setInstitutionsState] = useState<InstitutionState>(createInitialInstitutionState);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<MarketInstrumentId>("EXEX");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<InstitutionId>("UNICOL");
  const [activeView, setActiveView] = useState<"overview" | "detail" | "institutions" | "media" | "codex">("overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState<CodexDocumentId>("media-fragments");
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const [recentEvents, setRecentEvents] = useState<MarketEvent[]>(() => [generateMarketEvent("normal")]);
  const [feedPaused, setFeedPaused] = useState(false);
  const [newsIntensity, setNewsIntensity] = useState<NewsIntensity>("normal");
  const [eventMemory, setEventMemory] = useState<EventMemory>({});
  const [publicPulsePosts, setPublicPulsePosts] = useState<SocialPost[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now());
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentDraft>(loadContentDraft);
  const [showDraftPreview, setShowDraftPreview] = useState(false);
  const [localDraftEventIds, setLocalDraftEventIds] = useState<string[]>([]);
  const [localPulsePostIds, setLocalPulsePostIds] = useState<string[]>([]);
  const [localWorldPressure, setLocalWorldPressure] = useState<LocalWorldPressureTest | null>(null);
  const simulatedMinutesRef = useRef(219 * 1440 + 3 * 60 + 14);
  const [simulatedLabel, setSimulatedLabel] = useState(() => formatSimulatedLabel(simulatedMinutesRef.current));

  const sessionAgeMinutes = (Date.now() - sessionStartedAt) / 60000;
  const marketRegime = useMemo(
    () => classifyMarketRegime({ market, events: recentEvents, sessionAgeMinutes, institutionsState }),
    [institutionsState, market, recentEvents, sessionAgeMinutes],
  );
  const laneSummary = useMemo(() => summarizeStorylineLanes([...recentEvents].reverse()), [recentEvents]);
  const activeWorldModifier = useMemo(
    () =>
      deriveActiveWorldStateModifier({
        recentEvents: recentEvents.slice().reverse(),
        marketRegime,
        psaEnforcementCapacity: institutionsState.PSA.enforcementCapacity,
      }),
    [institutionsState.PSA.enforcementCapacity, marketRegime, recentEvents],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem("corporate-content-draft", JSON.stringify(contentDraft));
    } catch {
      // Draft persistence is a convenience only; copy tools still work without it.
    }
  }, [contentDraft]);

  useEffect(() => {
    if (localWorldPressure && localWorldPressure.remainingEvents <= 0) setLocalWorldPressure(null);
  }, [localWorldPressure]);

  const attachSimulatedTime = useCallback(
    (event: MarketEvent | null) => {
      simulatedMinutesRef.current += simulatedSpacingFor(event, marketRegime);
      const label = formatSimulatedLabel(simulatedMinutesRef.current);
      setSimulatedLabel(label);
      if (!event) return null;

      return {
        ...event,
        simulatedTimestamp: simulatedMinutesRef.current,
        simulatedLabel: label,
        marketRegime,
      };
    },
    [marketRegime],
  );

  const adjustEventForSimulation = useCallback(
    (event: MarketEvent): MarketEvent => {
      const impacts = cloneImpacts(event);
      const tags = event.tags ?? [];
      const unicol = institutionsState.UNICOL;
      const psa = institutionsState.PSA;
      const institutionalAccess = (unicol.credibility + unicol.operationalCapacity + unicol.signalAccess) / 300;
      const psaWeight = (psa.credibility + psa.mandateIntegrity + psa.publicTrust + psa.enforcementCapacity * 0.6) / 360;
      let pricedInResponse = event.pricedInResponse;
      const notes: string[] = [];

      if (event.category === "PSA Directive" || tags.includes("psa")) {
        const multiplier = 0.25 + psaWeight * 1.2;
        for (const id of ["EXEX", "OPSEC", "PXB-X"] as MarketInstrumentId[]) {
          if (impacts[id] !== undefined) impacts[id] = Number((impacts[id]! * multiplier).toFixed(2));
        }
        notes.push(`PSA directive weighted by legal credibility/mandate (${Math.round(psaWeight * 100)}%).`);
      }

      if (tags.includes("unicol")) {
        const multiplier = 0.35 + institutionalAccess * 1.15;
        for (const id of ["EXEX", "OPSEC", "OCI", "HALCYON", "SYNOPTIC"] as MarketInstrumentId[]) {
          if (impacts[id] !== undefined) impacts[id] = Number((impacts[id]! * multiplier).toFixed(2));
        }
        notes.push(`UNICOL report weighted by access/credibility (${Math.round(institutionalAccess * 100)}%).`);
      }

      if (unicol.operationalCapacity >= 40 || tags.includes("verified_access")) {
        for (const id of ["OCI", "HALCYON"] as MarketInstrumentId[]) {
          if ((impacts[id] ?? 0) > 0) impacts[id] = Number((impacts[id]! * 0.52).toFixed(2));
        }
        if ((impacts.OPSEC ?? 0) > 0) impacts.OPSEC = Number((impacts.OPSEC! * 0.72).toFixed(2));
        notes.push("Verified access capped ambiguity-driven risk premiums.");
      }

      if (event.source === "EXEX PUBLIC AFFAIRS" || event.involvedActors.includes("EXEX")) {
        const denialPressure = countMemory(eventMemory, "EXEX", ["denial", "legal_exposure", "public_visibility"]);
        const isDenial = tags.includes("denial") || /denies|denial|confidentiality/i.test(event.headline);
        const isPartialAdmission = tags.includes("partial_admission") || /partial|routing error|remediation|telemetry/i.test(event.headline);
        if (isDenial && denialPressure > 2.2) {
          impacts.EXEX = Number(((impacts.EXEX ?? 0) - Math.min(0.9, denialPressure * 0.12)).toFixed(2));
          impacts.OCI = Number(((impacts.OCI ?? 0) + 0.18).toFixed(2));
          pricedInResponse = true;
          notes.push("Repeated denial is losing effectiveness and is partially priced as confirmation.");
        }
        if (isPartialAdmission) {
          if ((impacts.EXEX ?? 0) < 0) impacts.EXEX = Number((impacts.EXEX! * 0.52).toFixed(2));
          impacts.OCI = Math.min(impacts.OCI ?? 0, 0.15);
          notes.push("Controlled partial admission reduced legal uncertainty versus another blanket denial.");
        }
      }

      if (tags.includes("security_contract") && (impacts.OPSEC ?? 0) > 0) {
        const liabilityMemory = countMemory(eventMemory, "OPSEC", ["security_contract", "oversight", "legal_exposure"]);
        const drag = Math.min(0.85, liabilityMemory * 0.08);
        impacts.OPSEC = Number((impacts.OPSEC! - drag).toFixed(2));
        if (liabilityMemory > 4) impacts.ACSB = Number(((impacts.ACSB ?? 0) - 0.25).toFixed(2));
        if (liabilityMemory > 2) notes.push("OPSEC upside reduced by accumulated oversight/liability costs.");
      }

      if (event.involvedActors.includes("HALCYON") && /fatality|recognition|exclusion|delay/i.test(event.headline)) {
        const reputationMemory = countMemory(eventMemory, "HALCYON", ["insurance", "civilian_harm", "legal_exposure"]);
        const reputationCost = Math.min(1.0, reputationMemory * 0.09);
        impacts.HALCYON = Number(((impacts.HALCYON ?? 0) - reputationCost).toFixed(2));
        if (reputationMemory > 3) impacts.OCI = Number(((impacts.OCI ?? 0) - 0.15).toFixed(2));
        if (reputationMemory > 2) notes.push("HALCYON recognition-delay language is developing a regulatory half-life.");
      }

      if (tags.includes("public_visibility") || event.category === "Public Reaction") {
        const saturation = Object.entries(eventMemory)
          .filter(([key]) => key.endsWith(":public_visibility"))
          .reduce((sum, [, value]) => sum + value, 0);
        if (saturation > 7) {
          impacts.EXEX = Number(((impacts.EXEX ?? 0) - 0.12).toFixed(2));
          impacts.OPSEC = Number(((impacts.OPSEC ?? 0) - 0.1).toFixed(2));
          impacts.OCI = Number(((impacts.OCI ?? 0) + 0.08).toFixed(2));
          notes.push("Public-reaction saturation is now affecting visibility and oversight assumptions.");
        }
      }

      const scarcityPremium =
        (tags.includes("pipeline") || tags.includes("sabotage") || tags.includes("resource_supply") ? 0.45 : 0) +
        ((impacts.CARBON ?? 0) > 0 ? -0.2 : 0);
      const deliveryDiscount =
        (tags.includes("transport") || tags.includes("logistics") ? ((impacts.ANCHOR ?? 0) < 0 ? 0.7 : -0.35) : 0) +
        (tags.includes("communications") || tags.includes("blackout") ? 0.25 : 0) +
        (tags.includes("safety_review") || tags.includes("legal_exposure") ? 0.35 : 0) +
        ((impacts.EXEX ?? 0) < -0.5 ? 0.25 : 0);
      if (tags.includes("resource_supply") || tags.includes("transport") || tags.includes("fuel_competition")) {
        impacts["PXB-X"] = Number(((impacts["PXB-X"] ?? 0) + scarcityPremium - deliveryDiscount).toFixed(2));
        if (deliveryDiscount > scarcityPremium) notes.push("PXB-X moved on delivery-confidence discount rather than scarcity premium.");
        else notes.push("PXB-X moved on scarcity/adoption premium.");
      }

      if (marketRegime === "PANIC") {
        for (const id of Object.keys(impacts) as MarketInstrumentId[]) {
          impacts[id] = Number((impacts[id]! * 0.86).toFixed(2));
        }
        notes.push("Panic regime damped raw event impact to avoid runaway liquidation.");
      }

      if (marketRegime === "DEGRADED_STABILITY" || marketRegime === "POST_CRISIS_PLATEAU" || marketRegime === "MANAGED_PLATEAU") {
        for (const id of Object.keys(impacts) as MarketInstrumentId[]) {
          const support = systemicSupportFor(id);
          const factor = 0.68 + (1 - support) * 0.18;
          impacts[id] = Number((impacts[id]! * factor).toFixed(2));
        }
        notes.push(
          marketRegime === "MANAGED_PLATEAU"
            ? "Managed plateau compressed repetitive event impact in both directions."
            : "Degraded stability regime compressed repetitive event impact in both directions.",
        );
      }

      return {
        ...event,
        impacts,
        pricedInResponse,
        marketRegime,
        marketStateNote: [event.marketStateNote, ...notes].filter(Boolean).join(" "),
      };
    },
    [eventMemory, institutionsState, marketRegime],
  );

  const applyMarketEvent = useCallback((event: MarketEvent | null) => {
    const now = Date.now();
    const sessionAgeMinutes = (now - sessionStartedAt) / 60000;
    const longSessionFactor = Math.min(1, sessionAgeMinutes / 30);
    const timedEvent = attachSimulatedTime(event);
    const activeEvent = timedEvent ? adjustEventForSimulation(timedEvent) : null;
    const rawReactionEvent = activeEvent ? generatePublicReactionEvent(activeEvent, recentEvents) : null;
    const reactionEvent = rawReactionEvent ? attachSimulatedTime(rawReactionEvent) : null;
    const publicPulse = activeEvent
      ? generateSocialPostsForEvent({
          event: activeEvent,
          market,
          institutionsState,
          recentPosts: publicPulsePosts,
        })
      : { posts: [], institutionImpacts: {} };
    const institutionEvents = activeEvent ? [activeEvent, ...(reactionEvent ? [reactionEvent] : [])] : [];
    const statusEvents: MarketEvent[] = [];

    if (activeEvent) {
      setLocalWorldPressure((current) =>
        current ? { ...current, remainingEvents: Math.max(0, current.remainingEvents - 1) } : current,
      );
      setEventMemory((current) => rememberEventTags(current, activeEvent));
      if (publicPulse.posts.length) {
        setPublicPulsePosts((current) =>
          [...publicPulse.posts, ...current]
            .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
            .slice(0, 90),
        );
      }
      setRecentEvents((current) =>
        [activeEvent, ...(reactionEvent ? [reactionEvent] : []), ...current.filter((item) => item.id !== activeEvent.id)]
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
          .slice(0, 300),
      );
      setInstitutionsState((current) => {
        const next = { ...current };

        for (const generatedEvent of institutionEvents) {
          for (const institution of institutions) {
            next[institution.id] = applyInstitutionImpact(
              next[institution.id],
              institution.id,
              generatedEvent.institutionImpacts[institution.id] ?? {},
            );
          }
        }

        for (const institution of institutions) {
          const impact = publicPulse.institutionImpacts[institution.id];
          if (!impact) continue;

          next[institution.id] = applyInstitutionImpact(next[institution.id], institution.id, impact);
        }

        return next;
      });
    }

    setMarket((current) => {
      const recoveryEvents: MarketEvent[] = [];
      const nextMarket = Object.fromEntries(
        marketInstruments.map((instrument) => {
          const point = current[instrument.id];
          const activeHalt = !!point.haltUntil && point.haltUntil > now;
          const rawEventImpact = activeEvent?.impacts[instrument.id] ?? 0;
          const memoryMultiplier = activeEvent ? pricedInMultiplier(instrument.id, activeEvent.tags, eventMemory) : 1;
          const guardedNegativeImpact =
            isAbnormalMarketStatus(point.marketStatus) && rawEventImpact < 0
              ? rawEventImpact * 0.28
              : rawEventImpact;
          const eventImpact = activeHalt ? 0 : guardedNegativeImpact * memoryMultiplier;
          const floorValue = floorValueFor(instrument.id, instrument.basePrice);
          const randomWalk = activeHalt ? 0 : (Math.random() - 0.5) * instrument.volatility * 0.34;
          const recoveryBias = activeHalt
            ? 0
            : applyMeanReversion(instrument.id, point.value, eventImpact, longSessionFactor, marketRegime);
          const drift = instrument.trendBias * 0.2 + point.eventBias * 0.28 + eventImpact + randomWalk + recoveryBias;
          const rawNextValue = activeHalt ? point.value : point.value * (1 + drift / 100);
          let nextValue = clamp(rawNextValue, floorValue);
          let haltUntil = point.haltUntil;
          let lastStatusEventAt = point.lastStatusEventAt;
          let distressScore = clamp(
            point.distressScore * 0.88 +
              (eventImpact < -0.2 ? Math.abs(eventImpact) / 1.7 : -0.14) +
              (rawNextValue < floorValue ? 0.9 : 0),
            0,
            10,
          );
          const eventTouchesInstrument = !!activeEvent && activeEvent.impacts[instrument.id] !== undefined;
          let headline = eventTouchesInstrument
            ? activeEvent.headline
            : Math.random() > 0.93
              ? instrument.headlines[Math.floor(Math.random() * instrument.headlines.length)]
              : point.headline;
          const windowReference = point.history.slice(-12)[0]?.value ?? point.previousClose;
          const windowDrop =
            windowReference > 0 ? ((nextValue - windowReference) / Math.max(windowReference, floorValue)) * 100 : 0;
          const circuitCooldownOpen = !lastStatusEventAt || now - lastStatusEventAt > 65000;
          let directStatusEvent: MarketEvent | undefined;

          if (!activeHalt && windowDrop <= -32 && circuitCooldownOpen) {
            nextValue = Math.max(floorValue, point.value * 0.97);
            haltUntil = now + 45000;
            lastStatusEventAt = now;
            distressScore = Math.max(distressScore, 6.8);
            headline = `${instrument.symbol} trading halted pending disclosure review.`;
            directStatusEvent = {
              ...createCircuitBreakerEvent(instrument.id, nextValue, windowReference),
              simulatedTimestamp: simulatedMinutesRef.current,
              simulatedLabel: formatSimulatedLabel(simulatedMinutesRef.current),
              marketRegime,
            };
            statusEvents.push(directStatusEvent);
          } else if (
            !eventTouchesInstrument &&
            !activeHalt &&
            shouldGenerateRecovery(instrument.id, nextValue, instrument.basePrice, eventImpact) &&
            recoveryEvents.length < 1
          ) {
            const recoveryEvent = createRecoveryEvent(instrument.id);
            recoveryEvents.push(recoveryEvent);
          }

          const marketStatus = classifyMarketStatus(nextValue, instrument.basePrice, {
            status: point.marketStatus,
            haltUntil,
            lastStatusEventAt,
            distressScore,
          });
          const eventIds = directStatusEvent
            ? [directStatusEvent.id]
            : eventTouchesInstrument && activeEvent
              ? [activeEvent.id]
              : [];
          const causeType = directStatusEvent
            ? "circuit_breaker"
            : activeHalt
              ? "circuit_breaker"
              : activeEvent?.triggeredRecovery && eventTouchesInstrument
                ? "recovery"
                : eventTouchesInstrument && memoryMultiplier < 0.86
                  ? "priced_in_decay"
                  : eventTouchesInstrument
                    ? "event"
                    : rawNextValue < floorValue
                      ? "correction"
                      : "ambient";
          const note =
            directStatusEvent?.headline ??
            (eventTouchesInstrument && activeEvent
              ? memoryMultiplier < 0.86
                ? `${activeEvent.headline} Market desks treat similar headlines as partially priced in.`
                : activeEvent.headline
              : rawNextValue < floorValue
                ? "Fundamental floor support limited the move."
                : "Ambient market movement / no major event recorded.");
          const historyPoint = createHistoryPoint({
            entityId: instrument.id,
            value: Number(nextValue.toFixed(2)),
            previousValue: point.value,
            eventIds,
            causeType,
            note,
            timestamp: now,
          });

          return [
            instrument.id,
            {
              value: Number(nextValue.toFixed(2)),
              previousClose: point.previousClose,
              history: [...point.history.slice(-89), historyPoint],
              headline,
              eventBias: eventImpact * 0.72 + point.eventBias * 0.5,
              recentEventIds: eventTouchesInstrument
                ? [activeEvent.id, ...point.recentEventIds.filter((id) => id !== activeEvent.id)].slice(0, 5)
                : point.recentEventIds,
              marketStatus,
              haltUntil,
              lastStatusEventAt,
              distressScore,
            },
          ];
        }),
      ) as MarketState;

      if (statusEvents.length) {
        window.setTimeout(() => {
          setRecentEvents((current) =>
            [...statusEvents, ...current]
              .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
              .slice(0, 300),
          );
        }, 0);
      }

      if (recoveryEvents.length) {
        window.setTimeout(() => {
          for (const recoveryEvent of recoveryEvents) {
            applyMarketEvent(recoveryEvent);
          }
        }, 80);
      }

      return nextMarket;
    });
  }, [
    adjustEventForSimulation,
    attachSimulatedTime,
    eventMemory,
    institutionsState,
    market,
    marketRegime,
    publicPulsePosts,
    recentEvents,
    sessionStartedAt,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const sessionAgeMinutes = (Date.now() - sessionStartedAt) / 60000;
      const ambientLongTab = sessionAgeMinutes > 35;
      const recoveryCandidate = marketInstruments.find((instrument) => {
        const point = market[instrument.id];
        return (
          point.marketStatus === "DISTRESSED" ||
          point.marketStatus === "UNDER REVIEW" ||
          point.marketStatus === "RESTRUCTURING" ||
          point.value < instrument.basePrice * 0.82
        );
      });
      const adjustedIntensity: NewsIntensity =
        marketRegime === "PANIC" ||
        marketRegime === "DEGRADED_STABILITY" ||
        marketRegime === "POST_CRISIS_PLATEAU" ||
        marketRegime === "MANAGED_PLATEAU"
          ? Math.random() > 0.35
            ? "low"
            : "normal"
          : ambientLongTab && newsIntensity === "high"
            ? "normal"
            : ambientLongTab && Math.random() > 0.42
              ? "low"
              : newsIntensity;
      const eventProbability =
        marketRegime === "POST_CRISIS_PLATEAU" || marketRegime === "MANAGED_PLATEAU"
          ? 0.38
          : marketRegime === "DEGRADED_STABILITY"
            ? 0.48
            : ambientLongTab
              ? 0.54
              : 0.72;
      const recoveryProbability =
        marketRegime === "RECOVERY"
          ? 0.34
          : marketRegime === "DEGRADED_STABILITY" || marketRegime === "MANAGED_PLATEAU"
            ? 0.24
            : 0.28;
      const event =
        !feedPaused && recoveryCandidate && Math.random() > 1 - recoveryProbability
          ? createRecoveryEvent(recoveryCandidate.id)
          : !feedPaused && Math.random() < eventProbability
            ? generateDirectedMarketEvent(
                {
                  market,
                  institutionsState,
                  recentEvents,
                  marketRegime,
                  activeStorylinePhase: activeStoryline.phase,
                },
                adjustedIntensity,
              )
            : null;
      applyMarketEvent(event);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [applyMarketEvent, feedPaused, institutionsState, market, marketRegime, newsIntensity, recentEvents, sessionStartedAt]);

  const selectedInstrument = useMemo(
    () => marketInstruments.find((instrument) => instrument.id === selectedInstrumentId) ?? marketInstruments[0],
    [selectedInstrumentId],
  );

  const selectedInstitution = institutionsState[selectedInstitutionId];
  const wallMarketStatus = new Date().getMinutes() % 2 === 0 ? "Market Open" : "Pre-Open Analysis";
  const marketStatus = `${wallMarketStatus} / ${marketRegime.replace(/_/g, " ")}`;
  const latestEvent = recentEvents[0];

  const openDocument = (documentId: CodexDocumentId, section?: string) => {
    setSelectedDocumentId(documentId);
    setSelectedSection(section);
    setActiveView("codex");
  };

  const openInstrument = (instrumentId: MarketInstrumentId) => {
    setSelectedInstrumentId(instrumentId);
    setActiveView("detail");
  };

  const openInstitution = (institutionId: InstitutionId) => {
    setSelectedInstitutionId(institutionId);
    setActiveView("institutions");
  };

  const generateEventNow = () => {
    applyMarketEvent(
      generateDirectedMarketEvent(
        {
          market,
          institutionsState,
          recentEvents,
          marketRegime,
          activeStorylinePhase: activeStoryline.phase,
        },
        newsIntensity,
      ),
    );
  };

  const resetSession = () => {
    simulatedMinutesRef.current = 219 * 1440 + 3 * 60 + 14;
    setSimulatedLabel(formatSimulatedLabel(simulatedMinutesRef.current));
    setSessionStartedAt(Date.now());
    setMarket(createInitialMarketState());
    setInstitutionsState(createInitialInstitutionState());
    setRecentEvents([generateMarketEvent("normal")]);
    setEventMemory({});
    setPublicPulsePosts([]);
    setLocalDraftEventIds([]);
    setLocalPulsePostIds([]);
    setLocalWorldPressure(null);
    setShowDraftPreview(false);
    setExportPreview(null);
    setFeedPaused(false);
    setCopyNotice("Session reset");
    window.setTimeout(() => setCopyNotice(null), 1600);
  };

  const copyText = (text: string, label?: string) => {
    const fallbackCopy = () => {
      const element = document.createElement("textarea");
      element.value = text;
      document.body.appendChild(element);
      element.select();
      document.execCommand("copy");
      document.body.removeChild(element);
    };

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    if (label) {
      setCopyNotice(label);
      window.setTimeout(() => setCopyNotice(null), 1600);
    }
  };

  const hasLocalTestContent = localDraftEventIds.length > 0 || localPulsePostIds.length > 0 || !!localWorldPressure;
  const appendLocalTestExport = (markdown: string, exportMode: MarketExportMode) => {
    if (!hasLocalTestContent) return markdown;

    const warningLine = `LOCAL TEST CONTENT PRESENT: operator draft content is included in this session.`;
    const withCleanWarning = markdown.replace(`Generated:`, `${warningLine}\n\nGenerated:`);
    if (exportMode !== "debug") return withCleanWarning;

    return [
      withCleanWarning,
      ``,
      `## Local Test Sandbox Diagnostics`,
      `- Local draft event ids: ${localDraftEventIds.join(", ") || "none"}`,
      `- Local pulse post ids: ${localPulsePostIds.join(", ") || "none"}`,
      localWorldPressure
        ? `- Forced local world pressure: ${localWorldPressure.title} (${localWorldPressure.remainingEvents} events remaining, preview/display only)`
        : `- Forced local world pressure: none`,
      `- Permanent dictionaries mutated: no`,
      `- Repo files written from browser: no`,
    ].join("\n");
  };

  const exportMarkdown = (exportMode: MarketExportMode = "clean") => {
    const markdown = appendLocalTestExport(
      exportSessionMarkdown({
        market,
        institutionsState,
        events: recentEvents,
        publicPulsePosts,
        marketStatus,
        marketRegime,
        exportMode,
      }),
      exportMode,
    );
    setExportPreview(markdown);
    copyText(markdown, exportMode === "debug" ? "Debug export copied" : "Clean export copied");
  };

  const downloadExport = (format: "md" | "debug-md" | "json") => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportMode: MarketExportMode = format === "debug-md" ? "debug" : "clean";
    const content =
      format === "md" || format === "debug-md"
        ? appendLocalTestExport(
            exportSessionMarkdown({
              market,
              institutionsState,
              events: recentEvents,
              publicPulsePosts,
              marketStatus,
              marketRegime,
              exportMode,
            }),
            exportMode,
          )
        : JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              marketStatus,
              marketRegime,
              simulatedLabel,
              activeStoryline,
              market,
              institutions: institutionsState,
              events: recentEvents,
              publicPulse: publicPulsePosts,
              localTestSandbox: {
                localDraftEventIds,
                localPulsePostIds,
                localWorldPressure,
              },
            },
            null,
            2,
          );
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `corporate-market-session-${timestamp}.${format === "json" ? "json" : "md"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateDraft = (patch: Partial<ContentDraft>) => setContentDraft((current) => ({ ...current, ...patch }));
  const appendDraftListValue = (
    field: "tags" | "relatedActors" | "affectedLanes" | "boostedSemanticPatterns" | "suppressedSemanticPatterns" | "boostedTags",
    value: string,
  ) => {
    if (!value) return;
    setContentDraft((current) => {
      const items = listFromDraft(current[field]);
      if (items.includes(value)) return current;
      return { ...current, [field]: [...items, value].join(", ") };
    });
  };

  const draftPayload = () => {
    if (contentDraft.kind === "pulse") {
      return {
        type: "publicPulseReactionDraft",
        reactionFamily: contentDraft.reactionFamily.trim(),
        suggestedHandleOrPersona: contentDraft.personaType.trim(),
        text: contentDraft.pulseText.trim(),
        toneOrSentiment: contentDraft.toneSentiment.trim(),
        tags: listFromDraft(contentDraft.tags),
        relatedActors: listFromDraft(contentDraft.relatedActors),
      };
    }

    if (contentDraft.kind === "modifier") {
      return {
        type: "worldStateModifierDraft",
        title: contentDraft.modifierTitle.trim(),
        summary: contentDraft.modifierSummary.trim(),
        affectedLanes: listFromDraft(contentDraft.affectedLanes),
        boostedSemanticPatterns: listFromDraft(contentDraft.boostedSemanticPatterns),
        suppressedSemanticPatterns: listFromDraft(contentDraft.suppressedSemanticPatterns),
        boostedTags: listFromDraft(contentDraft.boostedTags),
      };
    }

    return {
      type: "newsSurfaceVariantDraft",
      semanticPattern: contentDraft.semanticPattern.trim(),
      headline: contentDraft.headline.trim(),
      body: contentDraft.body.trim(),
      marketStateNote: contentDraft.marketStateNote.trim(),
      laneContext: contentDraft.laneContext.trim(),
      worldStateModifierContext: contentDraft.worldModifierContext.trim(),
      tags: listFromDraft(contentDraft.tags),
      relatedActors: listFromDraft(contentDraft.relatedActors),
    };
  };

  const draftIsValid = () => {
    const draft = draftPayload();
    if (draft.type === "publicPulseReactionDraft") return !!draft.reactionFamily && !!draft.text;
    if (draft.type === "worldStateModifierDraft") return !!draft.title && !!draft.summary;
    return !!draft.semanticPattern && !!draft.headline;
  };

  const draftTsSnippet = () => {
    const draft = draftPayload();
    if (draft.type === "publicPulseReactionDraft") {
      return `// Public Pulse reaction draft\n${JSON.stringify(draft, null, 2)}`;
    }
    if (draft.type === "worldStateModifierDraft") {
      return `// World-state modifier draft\n${JSON.stringify(draft, null, 2)}`;
    }
    return `// News surface variant draft\n${JSON.stringify(draft, null, 2)}`;
  };

  const copyDraft = (format: "json" | "ts") => {
    if (!draftIsValid()) {
      setCopyNotice("Draft needs required fields");
      window.setTimeout(() => setCopyNotice(null), 1800);
      return;
    }

    const content = format === "json" ? JSON.stringify(draftPayload(), null, 2) : draftTsSnippet();
    copyText(content, format === "json" ? "Draft JSON copied" : "Draft TS snippet copied");
  };

  const testNewsDraftAsEvent = () => {
    if (contentDraft.kind !== "news" || !draftIsValid()) {
      setCopyNotice("News draft needs semantic pattern and headline");
      window.setTimeout(() => setCopyNotice(null), 1800);
      return;
    }

    const now = Date.now();
    const actors = actorsFromDraft(contentDraft);
    const prefix = contentDraft.semanticPattern.split(":")[0];
    const impactActor = isMarketInstrumentId(prefix) ? prefix : "OCI";
    const eventId = `local-test-news-${now}`;
    const localEvent: MarketEvent = {
      id: eventId,
      category: "Market Note",
      tags: tagsFromDraft(contentDraft).length ? tagsFromDraft(contentDraft) : ["public_visibility"],
      headline: `[LOCAL TEST] ${contentDraft.headline.trim()}`,
      summary: contentDraft.body.trim() || "LOCAL TEST: operator draft news event.",
      involvedActors: actors.length ? actors : ["OCI"],
      impacts: { [impactActor]: 0.01 },
      institutionImpacts: {},
      mediaSnippet: "LOCAL TEST DRAFT: temporary operator news event.",
      publicReaction: "LOCAL TEST: draft event inserted by operator sandbox.",
      severity: "notice",
      source: "LOCAL TEST DRAFT",
      timestamp: now,
      generated: true,
      semanticPattern: contentDraft.semanticPattern.trim(),
      marketStateNote: [contentDraft.marketStateNote.trim(), "LOCAL TEST: operator draft."].filter(Boolean).join(" "),
      surfaceContextNote: [
        contentDraft.laneContext ? `LOCAL TEST lane context: ${contentDraft.laneContext}.` : "",
        contentDraft.worldModifierContext ? `LOCAL TEST world pressure context: ${contentDraft.worldModifierContext}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      directorNotes: ["LOCAL TEST DRAFT: one-off operator event; not part of permanent dictionaries."],
    };

    setLocalDraftEventIds((current) => [eventId, ...current].slice(0, 20));
    applyMarketEvent(localEvent);
    setCopyNotice("Local test event inserted");
    window.setTimeout(() => setCopyNotice(null), 1800);
  };

  const addLocalPulsePost = () => {
    if (contentDraft.kind !== "pulse" || !draftIsValid()) {
      setCopyNotice("Pulse draft needs family and text");
      window.setTimeout(() => setCopyNotice(null), 1800);
      return;
    }

    const now = Date.now();
    const postId = `local-test-pulse-${now}`;
    const post: SocialPost = {
      id: postId,
      timestamp: new Date(now).toISOString(),
      simulatedTime: simulatedLabel,
      accountId: "local-test-draft",
      handle: "@local_test_draft",
      displayName: "Local Test Draft",
      role: contentDraft.personaType || "operator draft persona",
      origin: "LOCAL TEST",
      text: `[LOCAL TEST] ${contentDraft.pulseText.trim()}`,
      tags: listFromDraft(contentDraft.tags),
      relatedActors: listFromDraft(contentDraft.relatedActors),
      sentiment: sentimentFromDraft(contentDraft.toneSentiment),
      intensity: 1,
      personaType: personaFromDraft(contentDraft.personaType),
      templateId: "LOCAL_TEST_DRAFT",
      family: contentDraft.reactionFamily.trim(),
      selectionScore: 0,
      selectionNotes: ["LOCAL TEST DRAFT: manually inserted operator pulse post; scoring not used."],
    };

    setLocalPulsePostIds((current) => [postId, ...current].slice(0, 20));
    setPublicPulsePosts((current) => [post, ...current].slice(0, 90));
    setCopyNotice("Local pulse post added");
    window.setTimeout(() => setCopyNotice(null), 1800);
  };

  const forceLocalWorldPressure = () => {
    if (contentDraft.kind !== "modifier" || !draftIsValid()) {
      setCopyNotice("Modifier draft needs title and summary");
      window.setTimeout(() => setCopyNotice(null), 1800);
      return;
    }

    setLocalWorldPressure({
      id: `local-test-world-pressure-${Date.now()}`,
      title: contentDraft.modifierTitle.trim(),
      summary: contentDraft.modifierSummary.trim(),
      affectedLanes: listFromDraft(contentDraft.affectedLanes),
      boostedSemanticPatterns: listFromDraft(contentDraft.boostedSemanticPatterns),
      suppressedSemanticPatterns: listFromDraft(contentDraft.suppressedSemanticPatterns),
      boostedTags: listFromDraft(contentDraft.boostedTags),
      remainingEvents: 8,
    });
    setCopyNotice("Local world pressure enabled");
    window.setTimeout(() => setCopyNotice(null), 1800);
  };

  const clearLocalTests = () => {
    const draftEventIds = new Set(localDraftEventIds);
    const pulseIds = new Set(localPulsePostIds);
    setRecentEvents((current) => current.filter((event) => !draftEventIds.has(event.id)));
    setPublicPulsePosts((current) => current.filter((post) => !pulseIds.has(post.id) && !draftEventIds.has(post.relatedEventId ?? "")));
    setLocalDraftEventIds([]);
    setLocalPulsePostIds([]);
    setLocalWorldPressure(null);
    setShowDraftPreview(false);
    setCopyNotice("Local tests cleared");
    window.setTimeout(() => setCopyNotice(null), 1800);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">INNER WORLDS MARKET FEED</p>
          <h1>Corporate Codex</h1>
          <p className="subhead">Proxima Exposure / Live Simulated Feed</p>
        </div>
        <div className="status-stack" aria-label="Market status">
          <span className="status-pill status-green">{wallMarketStatus}</span>
          <span className="status-pill">{marketRegime.replace(/_/g, " ")}</span>
          <span className="status-pill">{simulatedLabel}</span>
          {copyNotice ? <span className="status-pill copied">{copyNotice}</span> : null}
          <span className="status-pill">SIGNAL QUALITY: DEGRADED</span>
          <span className="status-pill warning">FLARE ACTIVITY: MODERATE</span>
          <details className="feed-menu">
            <summary>Feed</summary>
            <div>
              <button onClick={generateEventNow}>Step One Event</button>
              <button onClick={() => setFeedPaused((current) => !current)}>
                {feedPaused ? "Resume Feed" : "Pause Feed"}
              </button>
              <button onClick={resetSession}>Reset Session</button>
              <button onClick={() => exportMarkdown("clean")}>Copy Clean Export</button>
              <button onClick={() => exportMarkdown("debug")}>Copy Debug Export</button>
              <button onClick={() => downloadExport("md")}>Download Markdown</button>
              <button onClick={() => downloadExport("debug-md")}>Download Debug Markdown</button>
              <button onClick={() => downloadExport("json")}>Download JSON</button>
              <label>
                Intensity
                <select value={newsIntensity} onChange={(event) => setNewsIntensity(event.target.value as NewsIntensity)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
          </details>
        </div>
      </header>

      <section
        className="market-tape"
        aria-label="Open latest live item in Media Feed"
        aria-live="polite"
        onClick={() => setActiveView("media")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setActiveView("media");
          }
        }}
        role="button"
        tabIndex={0}
        title="Open Media Feed"
      >
        <span className={`event-dot ${latestEvent.severity}`} />
        <div className="market-tape-main">
          <div className="market-tape-copy">
            <strong>{latestEvent.headline}</strong>
            <span className="market-tape-summary">{latestEvent.summary}</span>
          </div>
          <EventImpactChips event={latestEvent} onSelectInstrument={openInstrument} />
        </div>
      </section>

      <section className="storyline-strip" aria-label="Active storyline">
        <span>ACTIVE STORYLINE</span>
        <strong>{activeStoryline.title}</strong>
        <em>{activeStoryline.phase}</em>
        <small>{regimeDescription(marketRegime)}</small>
      </section>

      <section className="operator-strip" aria-label="Operator tools status">
        <span>EVENTS {recentEvents.length}</span>
        <span>REGIME {marketRegime.replace(/_/g, " ")}</span>
        <span>LANE {laneSummary.dominantLane?.title ?? "none"}</span>
        <span>PRESSURE {activeWorldModifier?.modifier.title ?? "none"}</span>
        {localWorldPressure ? (
          <span className="local-test-status">LOCAL TEST WORLD PRESSURE: {localWorldPressure.title} / {localWorldPressure.remainingEvents}</span>
        ) : null}
        <span>{feedPaused ? "PAUSED" : "RUNNING"}</span>
      </section>

      {exportPreview ? (
        <section className="export-preview" aria-label="Market history export">
          <div>
            <strong>Market Log Markdown</strong>
            <button onClick={() => setExportPreview(null)}>Close</button>
          </div>
          <textarea readOnly value={exportPreview} />
        </section>
      ) : null}

      <details className="content-draft-pad">
        <summary>Content Draft Pad</summary>
        <div className="draft-grid">
          <label>
            Draft type
            <select value={contentDraft.kind} onChange={(event) => updateDraft({ kind: event.target.value as DraftKind })}>
              <option value="news">News surface variant</option>
              <option value="pulse">Public Pulse reaction</option>
              <option value="modifier">World-state modifier</option>
            </select>
          </label>

          {contentDraft.kind === "news" ? (
            <>
              <label>
                Semantic pattern
                <select value={contentDraft.semanticPattern} onChange={(event) => updateDraft({ semanticPattern: event.target.value })}>
                  <option value="">Select semantic pattern</option>
                  {operatorSemanticPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {pattern}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Headline
                <input value={contentDraft.headline} onChange={(event) => updateDraft({ headline: event.target.value })} />
              </label>
              <label>
                Body
                <textarea value={contentDraft.body} onChange={(event) => updateDraft({ body: event.target.value })} />
              </label>
              <label>
                Market state note
                <textarea value={contentDraft.marketStateNote} onChange={(event) => updateDraft({ marketStateNote: event.target.value })} />
              </label>
              <label>
                Lane context
                <select value={contentDraft.laneContext} onChange={(event) => updateDraft({ laneContext: event.target.value })}>
                  <option value="">No lane context</option>
                  {operatorLaneOptions.map((lane) => (
                    <option key={lane.id} value={lane.value}>
                      {lane.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                World pressure context
                <select value={contentDraft.worldModifierContext} onChange={(event) => updateDraft({ worldModifierContext: event.target.value })}>
                  <option value="">No world pressure</option>
                  {operatorWorldPressureOptions.map((modifier) => (
                    <option key={modifier.id} value={modifier.value}>
                      {modifier.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input value={contentDraft.tags} onChange={(event) => updateDraft({ tags: event.target.value })} placeholder="public_visibility, logistics" />
                <select value="" onChange={(event) => appendDraftListValue("tags", event.target.value)}>
                  <option value="">Add known tag</option>
                  {operatorTagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Related actors
                <input value={contentDraft.relatedActors} onChange={(event) => updateDraft({ relatedActors: event.target.value })} placeholder="ANCHOR, PXB-X" />
                <select value="" onChange={(event) => appendDraftListValue("relatedActors", event.target.value)}>
                  <option value="">Add known actor</option>
                  {operatorActorOptions.map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {contentDraft.kind === "pulse" ? (
            <>
              <label>
                Reaction family
                <select value={contentDraft.reactionFamily} onChange={(event) => updateDraft({ reactionFamily: event.target.value })}>
                  <option value="">Select reaction family</option>
                  {operatorReactionFamilies.map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Persona type
                <select value={contentDraft.personaType} onChange={(event) => updateDraft({ personaType: event.target.value })}>
                  <option value="">Select persona</option>
                  {operatorPersonaOptions.map((persona) => (
                    <option key={persona} value={persona}>
                      {persona}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Text
                <textarea value={contentDraft.pulseText} onChange={(event) => updateDraft({ pulseText: event.target.value })} />
              </label>
              <label>
                Tone / sentiment
                <select value={contentDraft.toneSentiment} onChange={(event) => updateDraft({ toneSentiment: event.target.value })}>
                  <option value="">Select tone or sentiment</option>
                  {operatorToneOptions.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input value={contentDraft.tags} onChange={(event) => updateDraft({ tags: event.target.value })} placeholder="data_suppression, footage_leak" />
                <select value="" onChange={(event) => appendDraftListValue("tags", event.target.value)}>
                  <option value="">Add known tag</option>
                  {operatorTagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Related actors
                <input value={contentDraft.relatedActors} onChange={(event) => updateDraft({ relatedActors: event.target.value })} placeholder="SYNOPTIC, UNICOL" />
                <select value="" onChange={(event) => appendDraftListValue("relatedActors", event.target.value)}>
                  <option value="">Add known actor</option>
                  {operatorActorOptions.map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {contentDraft.kind === "modifier" ? (
            <>
              <label>
                Title
                <input value={contentDraft.modifierTitle} onChange={(event) => updateDraft({ modifierTitle: event.target.value })} />
              </label>
              <label>
                Summary
                <textarea value={contentDraft.modifierSummary} onChange={(event) => updateDraft({ modifierSummary: event.target.value })} />
              </label>
              <label>
                Affected lanes
                <input value={contentDraft.affectedLanes} onChange={(event) => updateDraft({ affectedLanes: event.target.value })} placeholder="relay-access-crisis, cargo-sovereignty-dispute" />
                <select value="" onChange={(event) => appendDraftListValue("affectedLanes", event.target.value)}>
                  <option value="">Add known lane</option>
                  {operatorLaneIdOptions.map((lane) => (
                    <option key={lane.value} value={lane.value}>
                      {lane.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Boosted semantic patterns
                <input value={contentDraft.boostedSemanticPatterns} onChange={(event) => updateDraft({ boostedSemanticPatterns: event.target.value })} />
                <select value="" onChange={(event) => appendDraftListValue("boostedSemanticPatterns", event.target.value)}>
                  <option value="">Add boosted pattern</option>
                  {operatorSemanticPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {pattern}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Suppressed semantic patterns
                <input value={contentDraft.suppressedSemanticPatterns} onChange={(event) => updateDraft({ suppressedSemanticPatterns: event.target.value })} />
                <select value="" onChange={(event) => appendDraftListValue("suppressedSemanticPatterns", event.target.value)}>
                  <option value="">Add suppressed pattern</option>
                  {operatorSemanticPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {pattern}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Boosted tags
                <input value={contentDraft.boostedTags} onChange={(event) => updateDraft({ boostedTags: event.target.value })} />
                <select value="" onChange={(event) => appendDraftListValue("boostedTags", event.target.value)}>
                  <option value="">Add known tag</option>
                  {operatorTagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
        <details className="draft-reference">
          <summary>Context dictionary</summary>
          <div className="draft-reference-grid">
            <section>
              <h4>Semantic patterns</h4>
              <ul>
                {operatorSemanticPatterns.map((pattern) => (
                  <li key={pattern}>{pattern}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4>Narrative lanes</h4>
              <ul>
                {operatorLaneOptions.map((lane) => (
                  <li key={lane.id}>
                    <strong>{lane.label}</strong>
                    <span>{lane.hint}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4>World pressures</h4>
              <ul>
                {operatorWorldPressureOptions.map((modifier) => (
                  <li key={modifier.id}>
                    <strong>{modifier.label}</strong>
                    <span>{modifier.hint}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4>Public Pulse families</h4>
              <ul>
                {operatorReactionFamilies.map((family) => (
                  <li key={family}>{family}</li>
                ))}
              </ul>
            </section>
          </div>
        </details>
        <section className="local-test-sandbox" aria-label="Local test sandbox">
          <div className="local-test-heading">
            <div>
              <strong>Local Test Sandbox</strong>
              <p>Draft tests are temporary, browser-local, and do not write to the project or change permanent content dictionaries.</p>
            </div>
            <span>LOCAL TEST ONLY</span>
          </div>
          <div className="draft-actions">
            <button onClick={() => setShowDraftPreview(true)}>Preview draft</button>
            {contentDraft.kind === "news" ? <button onClick={testNewsDraftAsEvent}>Test as one-off event</button> : null}
            {contentDraft.kind === "pulse" ? <button onClick={addLocalPulsePost}>Add local pulse post</button> : null}
            {contentDraft.kind === "modifier" ? <button onClick={forceLocalWorldPressure}>Force local world pressure</button> : null}
            <button onClick={clearLocalTests}>Clear local tests</button>
          </div>
          {showDraftPreview ? (
            <article className="local-preview">
              <span>LOCAL PREVIEW</span>
              {contentDraft.kind === "news" ? (
                <>
                  <h3>{contentDraft.headline || "Untitled news draft"}</h3>
                  <p>{contentDraft.body || "No body drafted yet."}</p>
                  <dl>
                    <div>
                      <dt>Semantic pattern</dt>
                      <dd>{contentDraft.semanticPattern || "none"}</dd>
                    </div>
                    <div>
                      <dt>Lane context</dt>
                      <dd>{contentDraft.laneContext || "none"}</dd>
                    </div>
                    <div>
                      <dt>World pressure</dt>
                      <dd>{contentDraft.worldModifierContext || "none"}</dd>
                    </div>
                    <div>
                      <dt>Market note</dt>
                      <dd>{contentDraft.marketStateNote || "none"}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
              {contentDraft.kind === "pulse" ? (
                <>
                  <h3>{contentDraft.personaType || "Draft persona"} / {contentDraft.reactionFamily || "reaction family"}</h3>
                  <p>{contentDraft.pulseText || "No Public Pulse text drafted yet."}</p>
                  <dl>
                    <div>
                      <dt>Tone / sentiment</dt>
                      <dd>{contentDraft.toneSentiment || "none"}</dd>
                    </div>
                    <div>
                      <dt>Tags</dt>
                      <dd>{contentDraft.tags || "none"}</dd>
                    </div>
                    <div>
                      <dt>Related actors</dt>
                      <dd>{contentDraft.relatedActors || "none"}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
              {contentDraft.kind === "modifier" ? (
                <>
                  <h3>{contentDraft.modifierTitle || "Untitled world pressure draft"}</h3>
                  <p>{contentDraft.modifierSummary || "No summary drafted yet."}</p>
                  <dl>
                    <div>
                      <dt>Affected lanes</dt>
                      <dd>{contentDraft.affectedLanes || "none"}</dd>
                    </div>
                    <div>
                      <dt>Boosted patterns</dt>
                      <dd>{contentDraft.boostedSemanticPatterns || "none"}</dd>
                    </div>
                    <div>
                      <dt>Suppressed patterns</dt>
                      <dd>{contentDraft.suppressedSemanticPatterns || "none"}</dd>
                    </div>
                    <div>
                      <dt>Boosted tags</dt>
                      <dd>{contentDraft.boostedTags || "none"}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
            </article>
          ) : null}
          {localWorldPressure ? (
            <p className="local-test-note">
              LOCAL TEST WORLD PRESSURE: {localWorldPressure.title} remains visible for {localWorldPressure.remainingEvents} generated events. This pass does not bias director selection.
            </p>
          ) : null}
        </section>
        <div className="draft-actions">
          <button onClick={() => copyDraft("json")}>Copy JSON</button>
          <button onClick={() => copyDraft("ts")}>Copy TS snippet</button>
          <button onClick={() => setContentDraft({ ...emptyContentDraft, kind: contentDraft.kind })}>Clear draft</button>
        </div>
        <pre>{JSON.stringify(draftPayload(), null, 2)}</pre>
      </details>

      <nav className="view-tabs" aria-label="Primary sections">
        <button className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
          Overview
        </button>
        <button className={activeView === "detail" ? "active" : ""} onClick={() => setActiveView("detail")}>
          Detail
        </button>
        <button
          className={activeView === "institutions" ? "active" : ""}
          onClick={() => setActiveView("institutions")}
        >
          Institutions
        </button>
        <button className={activeView === "media" ? "active" : ""} onClick={() => setActiveView("media")}>
          Media Feed
        </button>
        <button className={activeView === "codex" ? "active" : ""} onClick={() => setActiveView("codex")}>
          Codex
        </button>
      </nav>

      {activeView === "overview" ? (
        <MarketDashboard market={market} recentEvents={recentEvents} onSelect={openInstrument} />
      ) : activeView === "detail" ? (
        <MarketDetail
          instrument={selectedInstrument}
          point={market[selectedInstrument.id]}
          recentEvents={recentEvents}
          onBack={() => setActiveView("overview")}
          onOpenDocument={openDocument}
          onSelectInstrument={openInstrument}
        />
      ) : activeView === "institutions" ? (
        <InstitutionsView
          institutions={institutionsState}
          selectedInstitutionId={selectedInstitution.id}
          recentEvents={recentEvents}
          onSelect={openInstitution}
          onOpenDocument={openDocument}
        />
      ) : activeView === "media" ? (
        <MediaFeed
          recentEvents={recentEvents}
          publicPulsePosts={publicPulsePosts}
          onOpenDocument={openDocument}
          onSelectInstrument={openInstrument}
        />
      ) : (
        <DocumentViewer
          documents={codexDocuments}
          selectedDocumentId={selectedDocumentId}
          selectedSection={selectedSection}
          onSelectDocument={(documentId) => {
            setSelectedDocumentId(documentId);
            setSelectedSection(undefined);
          }}
        />
      )}

      <footer>Simulated feed. For authorized internal review only.</footer>
    </main>
  );
}

export default App;
