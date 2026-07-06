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
import type { InstitutionImpact, MarketEvent } from "./data/events";
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
  const [sessionStartedAt] = useState(() => Date.now());
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const simulatedMinutesRef = useRef(219 * 1440 + 3 * 60 + 14);
  const [simulatedLabel, setSimulatedLabel] = useState(() => formatSimulatedLabel(simulatedMinutesRef.current));

  const sessionAgeMinutes = (Date.now() - sessionStartedAt) / 60000;
  const marketRegime = useMemo(
    () => classifyMarketRegime({ market, events: recentEvents, sessionAgeMinutes, institutionsState }),
    [institutionsState, market, recentEvents, sessionAgeMinutes],
  );

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

  const copyText = (text: string) => {
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
      return;
    }

    fallbackCopy();
  };

  const exportMarkdown = (exportMode: MarketExportMode = "clean") => {
    const markdown = exportSessionMarkdown({
      market,
      institutionsState,
      events: recentEvents,
      publicPulsePosts,
      marketStatus,
      marketRegime,
      exportMode,
    });
    setExportPreview(markdown);
    copyText(markdown);
  };

  const downloadExport = (format: "md" | "debug-md" | "json") => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const content =
      format === "md" || format === "debug-md"
        ? exportSessionMarkdown({
            market,
            institutionsState,
            events: recentEvents,
            publicPulsePosts,
            marketStatus,
            marketRegime,
            exportMode: format === "debug-md" ? "debug" : "clean",
          })
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
          <span className="status-pill">SIGNAL QUALITY: DEGRADED</span>
          <span className="status-pill warning">FLARE ACTIVITY: MODERATE</span>
          <details className="feed-menu">
            <summary>Feed</summary>
            <div>
              <button onClick={generateEventNow}>Generate Event</button>
              <button onClick={() => setFeedPaused((current) => !current)}>
                {feedPaused ? "Resume Feed" : "Pause Feed"}
              </button>
              <button onClick={() => exportMarkdown("clean")}>Copy Market Log</button>
              <button onClick={() => exportMarkdown("debug")}>Copy Debug Log</button>
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

      {exportPreview ? (
        <section className="export-preview" aria-label="Market history export">
          <div>
            <strong>Market Log Markdown</strong>
            <button onClick={() => setExportPreview(null)}>Close</button>
          </div>
          <textarea readOnly value={exportPreview} />
        </section>
      ) : null}

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
