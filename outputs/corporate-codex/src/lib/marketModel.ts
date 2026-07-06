import { institutions, marketInstruments, type Institution, type MarketInstrumentId } from "../data/entities";
import type { EventTag, MarketEvent } from "../data/events";
import { classifyEventStorylineLanes, summarizeStorylineLanes } from "../data/storylineLanes";
import type { MarketState, InstitutionState } from "../App";
import { summarizeDirectorSession } from "../sim/director";
import { summarizePublicPulse, type SocialPost } from "../sim/socialEngine";

export type CauseType =
  | "event"
  | "ambient"
  | "recovery"
  | "circuit_breaker"
  | "correction"
  | "priced_in_decay";

export type MarketStatus =
  | "NORMAL"
  | "VOLATILE"
  | "DISTRESSED"
  | "HALTED"
  | "UNDER REVIEW"
  | "RESTRUCTURING"
  | "DELISTED";

export type MarketRegime =
  | "NORMAL"
  | "RISK_OFF"
  | "MARKET_VOLATILITY"
  | "DEGRADED_STABILITY"
  | "PANIC"
  | "RECOVERY"
  | "MANAGED_PLATEAU"
  | "HALTED_REVIEW"
  | "POST_CRISIS_PLATEAU";

export type MarketHistoryPoint = {
  timestamp: number;
  entityId: MarketInstrumentId;
  value: number;
  previousValue: number;
  delta: number;
  percentChange: number;
  simulatedVolume: number;
  eventIds: string[];
  causeType: CauseType;
  note: string;
};

export type ActorMarketProfile = {
  fundamentalValue: number;
  assetBacking: number;
  resilience: number;
  liquidity: number;
  scandalSensitivity: number;
  recoveryBias: number;
  floorRatio: number;
};

export type HumanSystemsProfile = {
  systemicImportance: number;
  marketShare: number;
  substitutionDifficulty: number;
  contractDepth: number;
  assetBacking: number;
  strategicDependency: number;
  politicalProtection: number;
  publicSensitivity: number;
  proximaExposure: number;
  physicalAssetRisk: number;
  legalResilience: number;
  recoveryBias: number;
  sectors: Array<{ label: string; share: number }>;
};

export type ActorRuntimeState = {
  status: MarketStatus;
  haltUntil?: number;
  lastStatusEventAt?: number;
  distressScore: number;
};

export type EventMemory = Record<string, number>;

export type ActiveStoryline = {
  id: string;
  title: string;
  phase: string;
  primaryPressure: string;
  beneficiaries: string[];
  unresolved: string[];
};

export const activeStoryline: ActiveStoryline = {
  id: "corridor-12b-licensing-dispute",
  title: "Corridor 12-B Licensing Dispute",
  phase: "Evidence Suppression / Market Volatility",
  primaryPressure: "EXEX legal exposure",
  beneficiaries: ["OPSEC", "OCI", "HALCYON"],
  unresolved: ["SYNOPTIC imagery request", "PSA enforcement capacity", "UNICOL access"],
};

export const actorMarketProfiles: Record<MarketInstrumentId, ActorMarketProfile> = {
  EXEX: {
    fundamentalValue: 720,
    assetBacking: 0.92,
    resilience: 0.86,
    liquidity: 0.82,
    scandalSensitivity: 0.82,
    recoveryBias: 0.76,
    floorRatio: 0.38,
  },
  OPSEC: {
    fundamentalValue: 270,
    assetBacking: 0.62,
    resilience: 0.72,
    liquidity: 0.75,
    scandalSensitivity: 0.68,
    recoveryBias: 0.56,
    floorRatio: 0.32,
  },
  SYNOPTIC: {
    fundamentalValue: 176,
    assetBacking: 0.82,
    resilience: 0.78,
    liquidity: 0.68,
    scandalSensitivity: 0.9,
    recoveryBias: 0.7,
    floorRatio: 0.42,
  },
  LUMEN: {
    fundamentalValue: 92,
    assetBacking: 0.75,
    resilience: 0.72,
    liquidity: 0.66,
    scandalSensitivity: 0.58,
    recoveryBias: 0.6,
    floorRatio: 0.4,
  },
  HALCYON: {
    fundamentalValue: 126,
    assetBacking: 0.64,
    resilience: 0.68,
    liquidity: 0.7,
    scandalSensitivity: 0.7,
    recoveryBias: 0.52,
    floorRatio: 0.34,
  },
  DOMUS: {
    fundamentalValue: 64,
    assetBacking: 0.68,
    resilience: 0.6,
    liquidity: 0.56,
    scandalSensitivity: 0.86,
    recoveryBias: 0.82,
    floorRatio: 0.36,
  },
  CARBON: {
    fundamentalValue: 238,
    assetBacking: 0.88,
    resilience: 0.8,
    liquidity: 0.76,
    scandalSensitivity: 0.38,
    recoveryBias: 0.5,
    floorRatio: 0.42,
  },
  ANCHOR: {
    fundamentalValue: 116,
    assetBacking: 0.78,
    resilience: 0.7,
    liquidity: 0.7,
    scandalSensitivity: 0.52,
    recoveryBias: 0.62,
    floorRatio: 0.38,
  },
  "PXB-X": {
    fundamentalValue: 140,
    assetBacking: 0.7,
    resilience: 0.64,
    liquidity: 0.86,
    scandalSensitivity: 0.32,
    recoveryBias: 0.42,
    floorRatio: 0.28,
  },
  OCI: {
    fundamentalValue: 214,
    assetBacking: 0.62,
    resilience: 0.58,
    liquidity: 0.8,
    scandalSensitivity: 0.22,
    recoveryBias: 0.36,
    floorRatio: 0.3,
  },
  ACSB: {
    fundamentalValue: 170,
    assetBacking: 0.58,
    resilience: 0.62,
    liquidity: 0.72,
    scandalSensitivity: 0.52,
    recoveryBias: 0.46,
    floorRatio: 0.3,
  },
};

export const humanSystemsProfiles: Record<MarketInstrumentId, HumanSystemsProfile> = {
  EXEX: {
    systemicImportance: 94,
    marketShare: 71,
    substitutionDifficulty: 88,
    contractDepth: 86,
    assetBacking: 94,
    strategicDependency: 91,
    politicalProtection: 76,
    publicSensitivity: 84,
    proximaExposure: 92,
    physicalAssetRisk: 68,
    legalResilience: 82,
    recoveryBias: 76,
    sectors: [
      { label: "Mars industrial alloy demand", share: 38 },
      { label: "orbital construction alloys", share: 46 },
      { label: "autonomous systems materials", share: 31 },
      { label: "off-world mining infrastructure", share: 67 },
    ],
  },
  OPSEC: {
    systemicImportance: 77,
    marketShare: 42,
    substitutionDifficulty: 66,
    contractDepth: 72,
    assetBacking: 58,
    strategicDependency: 86,
    politicalProtection: 74,
    publicSensitivity: 71,
    proximaExposure: 58,
    physicalAssetRisk: 44,
    legalResilience: 60,
    recoveryBias: 56,
    sectors: [
      { label: "frontier security continuity", share: 35 },
      { label: "MUTO deployment systems", share: 48 },
      { label: "industrial perimeter control", share: 41 },
    ],
  },
  SYNOPTIC: {
    systemicImportance: 83,
    marketShare: 61,
    substitutionDifficulty: 79,
    contractDepth: 74,
    assetBacking: 72,
    strategicDependency: 88,
    politicalProtection: 78,
    publicSensitivity: 69,
    proximaExposure: 64,
    physicalAssetRisk: 28,
    legalResilience: 66,
    recoveryBias: 70,
    sectors: [
      { label: "certified orbital evidence packages", share: 61 },
      { label: "thermal verification contracts", share: 54 },
      { label: "frontier mapping feeds", share: 47 },
    ],
  },
  LUMEN: {
    systemicImportance: 86,
    marketShare: 58,
    substitutionDifficulty: 81,
    contractDepth: 71,
    assetBacking: 70,
    strategicDependency: 92,
    politicalProtection: 64,
    publicSensitivity: 62,
    proximaExposure: 52,
    physicalAssetRisk: 50,
    legalResilience: 61,
    recoveryBias: 60,
    sectors: [
      { label: "priority relay traffic in flare-prone systems", share: 44 },
      { label: "emergency uplink routing", share: 52 },
      { label: "observer channel support", share: 36 },
    ],
  },
  HALCYON: {
    systemicImportance: 72,
    marketShare: 49,
    substitutionDifficulty: 60,
    contractDepth: 82,
    assetBacking: 63,
    strategicDependency: 67,
    politicalProtection: 57,
    publicSensitivity: 78,
    proximaExposure: 48,
    physicalAssetRisk: 18,
    legalResilience: 58,
    recoveryBias: 52,
    sectors: [
      { label: "outer colony insurance books", share: 43 },
      { label: "evacuation riders", share: 57 },
      { label: "infrastructure underwriting", share: 39 },
    ],
  },
  DOMUS: {
    systemicImportance: 81,
    marketShare: 36,
    substitutionDifficulty: 72,
    contractDepth: 66,
    assetBacking: 64,
    strategicDependency: 84,
    politicalProtection: 48,
    publicSensitivity: 92,
    proximaExposure: 61,
    physicalAssetRisk: 78,
    legalResilience: 45,
    recoveryBias: 82,
    sectors: [
      { label: "registered outer-colony water loop contracts", share: 27 },
      { label: "civilian habitat modules", share: 33 },
      { label: "emergency shelter reconstruction", share: 42 },
    ],
  },
  CARBON: {
    systemicImportance: 88,
    marketShare: 64,
    substitutionDifficulty: 76,
    contractDepth: 84,
    assetBacking: 89,
    strategicDependency: 80,
    politicalProtection: 82,
    publicSensitivity: 38,
    proximaExposure: 18,
    physicalAssetRisk: 31,
    legalResilience: 74,
    recoveryBias: 50,
    sectors: [
      { label: "legacy ship fuel contracts", share: 51 },
      { label: "colonial generator fuel reserves", share: 46 },
      { label: "fusion feedstock hedging", share: 34 },
    ],
  },
  ANCHOR: {
    systemicImportance: 79,
    marketShare: 43,
    substitutionDifficulty: 68,
    contractDepth: 73,
    assetBacking: 71,
    strategicDependency: 83,
    politicalProtection: 55,
    publicSensitivity: 44,
    proximaExposure: 72,
    physicalAssetRisk: 62,
    legalResilience: 57,
    recoveryBias: 62,
    sectors: [
      { label: "Proxima outbound cargo windows", share: 48 },
      { label: "orbital freight slots", share: 37 },
      { label: "containerized concentrate movement", share: 54 },
    ],
  },
  "PXB-X": {
    systemicImportance: 74,
    marketShare: 100,
    substitutionDifficulty: 65,
    contractDepth: 44,
    assetBacking: 50,
    strategicDependency: 72,
    politicalProtection: 30,
    publicSensitivity: 35,
    proximaExposure: 100,
    physicalAssetRisk: 70,
    legalResilience: 35,
    recoveryBias: 42,
    sectors: [
      { label: "Proxima concentrate futures exposure", share: 100 },
      { label: "forward resource pricing", share: 72 },
    ],
  },
  OCI: {
    systemicImportance: 68,
    marketShare: 100,
    substitutionDifficulty: 54,
    contractDepth: 66,
    assetBacking: 48,
    strategicDependency: 63,
    politicalProtection: 35,
    publicSensitivity: 20,
    proximaExposure: 74,
    physicalAssetRisk: 12,
    legalResilience: 45,
    recoveryBias: 36,
    sectors: [
      { label: "outer colony risk premium basket", share: 100 },
      { label: "evacuation liability pricing", share: 76 },
    ],
  },
  ACSB: {
    systemicImportance: 70,
    marketShare: 100,
    substitutionDifficulty: 58,
    contractDepth: 62,
    assetBacking: 45,
    strategicDependency: 80,
    politicalProtection: 66,
    publicSensitivity: 48,
    proximaExposure: 42,
    physicalAssetRisk: 24,
    legalResilience: 54,
    recoveryBias: 46,
    sectors: [
      { label: "autonomous combat systems basket", share: 100 },
      { label: "MUTO-compatible suppliers", share: 63 },
    ],
  },
};

export const SAFE_PERCENT_REFERENCE = 1;
export const DISPLAY_PERCENT_CAP = 999;

export const referenceFloorFor = (actorId: MarketInstrumentId, basePrice: number) => {
  const profile = actorMarketProfiles[actorId];
  return Math.max(SAFE_PERCENT_REFERENCE, basePrice * 0.12, profile.fundamentalValue * 0.12);
};

export const safePercentChange = (
  value: number,
  referenceValue: number,
  actorId: MarketInstrumentId,
  basePrice: number,
) => {
  const safeReference = Math.max(Math.abs(referenceValue), referenceFloorFor(actorId, basePrice));
  return ((value - referenceValue) / safeReference) * 100;
};

export const formatCappedPercent = (percent: number) => {
  if (!Number.isFinite(percent)) return "EXTREME";
  if (Math.abs(percent) > DISPLAY_PERCENT_CAP) {
    return `${percent >= 0 ? "+" : "-"}${DISPLAY_PERCENT_CAP}%+`;
  }

  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
};

export const isAbnormalMarketStatus = (status: MarketStatus) =>
  status === "DISTRESSED" ||
  status === "HALTED" ||
  status === "UNDER REVIEW" ||
  status === "RESTRUCTURING" ||
  status === "DELISTED";

export const createInitialActorRuntime = (): Record<MarketInstrumentId, ActorRuntimeState> =>
  Object.fromEntries(
    marketInstruments.map((instrument) => [
      instrument.id,
      {
        status: "NORMAL",
        distressScore: 0,
      },
    ]),
  ) as Record<MarketInstrumentId, ActorRuntimeState>;

export const createHistoryPoint = ({
  entityId,
  value,
  previousValue,
  eventIds,
  causeType,
  note,
  timestamp,
}: {
  entityId: MarketInstrumentId;
  value: number;
  previousValue: number;
  eventIds: string[];
  causeType: CauseType;
  note: string;
  timestamp: number;
}): MarketHistoryPoint => {
  const delta = value - previousValue;
  const instrument = marketInstruments.find((item) => item.id === entityId) ?? marketInstruments[0];
  const percentChange = safePercentChange(value, previousValue, entityId, instrument.basePrice);
  const simulatedVolume = Math.round(1200 + Math.abs(percentChange) * 860 + Math.random() * 1900);

  return {
    timestamp,
    entityId,
    value,
    previousValue,
    delta: Number(delta.toFixed(2)),
    percentChange: Number(percentChange.toFixed(2)),
    simulatedVolume,
    eventIds,
    causeType,
    note,
  };
};

export const pricedInMultiplier = (
  actorId: MarketInstrumentId,
  tags: EventTag[] = [],
  eventMemory: EventMemory,
) => {
  const counts = tags.map((tag) => eventMemory[`${actorId}:${tag}`] ?? 0);
  const maxCount = Math.max(0, ...counts);
  if (maxCount <= 1) return 1;
  return Math.max(0.38, 1 - maxCount * 0.13);
};

export const rememberEventTags = (
  memory: EventMemory,
  event: MarketEvent,
  decay = 0.95,
): EventMemory => {
  const next = Object.fromEntries(Object.entries(memory).map(([key, value]) => [key, value * decay])) as EventMemory;

  for (const actorId of event.involvedActors) {
    for (const tag of event.tags) {
      next[`${actorId}:${tag}`] = (next[`${actorId}:${tag}`] ?? 0) + 1;
    }
  }

  return next;
};

export const classifyMarketStatus = (value: number, basePrice: number, runtime: ActorRuntimeState): MarketStatus => {
  if (runtime.haltUntil && runtime.haltUntil > Date.now()) return "HALTED";
  const drawdown = (value - basePrice) / basePrice;
  if (drawdown <= -0.72 && runtime.distressScore > 9.4) return "DELISTED";
  if (drawdown <= -0.5) return "RESTRUCTURING";
  if (drawdown <= -0.34 && runtime.distressScore > 6.2) return "UNDER REVIEW";
  if (drawdown <= -0.34) return "DISTRESSED";
  if (drawdown <= -0.18 || Math.abs(runtime.distressScore) > 4) return "VOLATILE";
  return "NORMAL";
};

export const floorValueFor = (actorId: MarketInstrumentId, basePrice: number) => {
  const profile = actorMarketProfiles[actorId];
  const systems = humanSystemsProfiles[actorId];
  const systemsFloorBoost = 1 + systems.systemicImportance / 500;
  return Math.max(basePrice * profile.floorRatio * systemsFloorBoost, profile.fundamentalValue * profile.floorRatio);
};

export const fairValueFor = (actorId: MarketInstrumentId, basePrice: number) => {
  const profile = actorMarketProfiles[actorId];
  const systems = humanSystemsProfiles[actorId];
  const dependencyPremium =
    (systems.systemicImportance +
      systems.substitutionDifficulty +
      systems.contractDepth +
      systems.strategicDependency +
      systems.politicalProtection) /
    500;

  return Math.max(profile.fundamentalValue, basePrice * (0.88 + dependencyPremium * 0.22));
};

export const applyMeanReversion = (
  actorId: MarketInstrumentId,
  currentValue: number,
  eventImpact: number,
  longSessionFactor: number,
  marketRegime: MarketRegime = "NORMAL",
) => {
  const profile = actorMarketProfiles[actorId];
  const instrument = marketInstruments.find((item) => item.id === actorId) ?? marketInstruments[0];
  const fairValue = fairValueFor(actorId, instrument.basePrice);
  const systems = humanSystemsProfiles[actorId];
  const regimeFactor =
    marketRegime === "PANIC"
      ? 0.45
      : marketRegime === "RISK_OFF" || marketRegime === "MARKET_VOLATILITY"
        ? 0.65
        : marketRegime === "DEGRADED_STABILITY" || marketRegime === "POST_CRISIS_PLATEAU"
          ? 1.15
          : marketRegime === "MANAGED_PLATEAU"
            ? 1.05
          : marketRegime === "RECOVERY"
            ? 1.08
            : 1;
  const distance = (fairValue - currentValue) / Math.max(fairValue, 1);
  const systemsSupport =
    (systems.systemicImportance + systems.assetBacking + systems.strategicDependency + systems.contractDepth) / 400;
  const strength =
    (0.02 + profile.recoveryBias * 0.035 + systemsSupport * 0.04 + longSessionFactor * 0.03) *
    regimeFactor *
    (Math.abs(eventImpact) < 0.2 ? 1 : 0.5);
  return distance * strength * 100;
};

export const shouldGenerateRecovery = (
  actorId: MarketInstrumentId,
  value: number,
  basePrice: number,
  eventImpact: number,
) => {
  const profile = actorMarketProfiles[actorId];
  const drawdown = (value - basePrice) / basePrice;
  return drawdown < -0.16 && eventImpact < 0.2 && Math.random() < profile.recoveryBias * 0.28;
};

export const classifyMarketRegime = ({
  market,
  events,
  sessionAgeMinutes,
  institutionsState,
}: {
  market: MarketState;
  events: MarketEvent[];
  sessionAgeMinutes: number;
  institutionsState?: InstitutionState;
}): MarketRegime => {
  const values = marketInstruments.map((instrument) => {
    const point = market[instrument.id];
    return safePercentChange(point.value, point.previousClose, instrument.id, instrument.basePrice);
  });
  const averageMove = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const negativeCount = values.filter((value) => value < -4).length;
  const haltedCount = marketInstruments.filter((instrument) => market[instrument.id].marketStatus === "HALTED").length;
  const recent = events.slice(0, 12);
  const immediate = events.slice(0, 6);
  const materialCount = recent.filter((event) => event.severity === "material").length;
  const stabilizationCount = recent.filter((event) => event.triggeredRecovery || event.tags.includes("reconstruction") || event.tags.includes("verified_access")).length;
  const unresolvedPressureCount = recent.filter(
    (event) =>
      event.tags.includes("legal_exposure") ||
      event.tags.includes("public_visibility") ||
      event.tags.includes("civilian_harm") ||
      event.tags.includes("data_suppression") ||
      event.tags.includes("denial") ||
      event.category === "PSA Directive",
  ).length;
  const majorDestabilizerCount = immediate.filter(
    (event) =>
      event.severity === "material" ||
      event.category === "Leak" ||
      event.tags.includes("blackout") ||
      event.tags.includes("habitat_failure") ||
      event.tags.includes("data_suppression") ||
      event.tags.includes("civilian_harm"),
  ).length;
  const riskPremiumMoves = (["OCI", "HALCYON"] as MarketInstrumentId[]).map((id) => {
    const instrument = marketInstruments.find((item) => item.id === id) ?? marketInstruments[0];
    const point = market[id];
    return safePercentChange(point.value, point.previousClose, id, instrument.basePrice);
  });
  const riskPremiumMove = riskPremiumMoves.reduce((sum, value) => sum + value, 0) / riskPremiumMoves.length;
  const riskPremiumEasing = riskPremiumMove < -0.3;
  const psaEnforcementWeak = !institutionsState || institutionsState.PSA.enforcementCapacity < 12;
  const strongStabilization = stabilizationCount >= 5 && averageMove > -2 && unresolvedPressureCount <= 2 && majorDestabilizerCount === 0 && riskPremiumEasing;
  const containedButUnresolved =
    stabilizationCount >= 2 &&
    averageMove > -7 &&
    (unresolvedPressureCount >= 2 || majorDestabilizerCount > 0 || psaEnforcementWeak);

  if (haltedCount) return "HALTED_REVIEW";
  if (negativeCount >= Math.ceil(marketInstruments.length * 0.72) && materialCount >= 4) return "PANIC";
  if (strongStabilization && !psaEnforcementWeak) return "RECOVERY";
  if (containedButUnresolved) return "MANAGED_PLATEAU";
  if (sessionAgeMinutes > 35 && materialCount <= 2 && Math.abs(averageMove) < 9) return "POST_CRISIS_PLATEAU";
  if (negativeCount >= Math.ceil(marketInstruments.length * 0.5)) return "DEGRADED_STABILITY";
  if (materialCount >= 3) return "MARKET_VOLATILITY";
  if (averageMove < -3) return "RISK_OFF";
  return "NORMAL";
};

export const regimeDescription = (regime: MarketRegime) => {
  const descriptions: Record<MarketRegime, string> = {
    NORMAL: "Baseline trading. Crisis noise exists, but pricing remains orderly.",
    RISK_OFF: "Risk is being reduced across exposed actors while hedges and defensive indexes stay bid.",
    MARKET_VOLATILITY: "Material headlines are arriving faster than desks can fully digest.",
    DEGRADED_STABILITY: "The market has absorbed the initial shock. Risk pricing remains elevated, but volatility is narrowing.",
    PANIC: "Participants are pricing cascading uncertainty rather than individual events.",
    RECOVERY: "Legal pressure is easing and verified stabilization signals are beginning to restore confidence.",
    MANAGED_PLATEAU: "Verification and reconstruction signals are limiting risk premiums, but the underlying dispute remains unresolved.",
    HALTED_REVIEW: "One or more instruments are under trading review after a current-window shock.",
    POST_CRISIS_PLATEAU: "Long-session fatigue has set in. Catastrophe risk is priced, but collapse is no longer accelerating.",
  };
  return descriptions[regime];
};

export const systemicSupportFor = (actorId: MarketInstrumentId) => {
  const systems = humanSystemsProfiles[actorId];
  return (
    systems.systemicImportance +
    systems.substitutionDifficulty +
    systems.contractDepth +
    systems.assetBacking +
    systems.strategicDependency +
    systems.politicalProtection
  ) / 600;
};

export const createCircuitBreakerEvent = (
  actorId: MarketInstrumentId,
  value: number,
  referenceValue: number,
): MarketEvent => {
  const instrument = marketInstruments.find((item) => item.id === actorId) ?? marketInstruments[0];
  const drawdown = safePercentChange(value, referenceValue, actorId, instrument.basePrice);
  const timestamp = Date.now();

  return {
    id: `circuit-${actorId}-${timestamp}`,
    category: "Market Note",
    tags: ["legal_exposure", "public_visibility"],
    headline: `${actorId} trading halted pending disclosure review.`,
    summary: `${instrument.fullName} entered a temporary trading halt after a ${drawdown.toFixed(1)}% current-window drawdown.`,
    involvedActors: [actorId],
    impacts: {},
    institutionImpacts: {},
    mediaSnippet: `${actorId} trading halted after current-window drawdown exceeded desk limits.`,
    severity: "material",
    source: "INNER WORLDS MARKET FEED",
    timestamp,
    generated: true,
    triggeredCircuitBreaker: true,
    pricedInResponse: true,
    marketStateNote: "Circuit breaker reduced further negative event impacts while disclosure review is active.",
    storylineId: activeStoryline.id,
    phase: "Trading Halt",
  };
};

const recoveryEventData: Record<
  MarketInstrumentId,
  Array<Pick<MarketEvent, "headline" | "summary" | "tags" | "impacts" | "source" | "templateId" | "semanticPattern">>
> = {
  EXEX: [
    {
      templateId: "RECOVERY:EXEX:investor_call",
      semanticPattern: "RECOVERY:EXEX:investor_call",
      headline: "EXEX announces emergency investor call.",
      summary: "Management cited asset backing, legacy licenses, and alternate extraction routes.",
      tags: ["extraction", "legal_exposure", "resource_supply"],
      impacts: { EXEX: 1.2, "PXB-X": 0.4, OCI: -0.2 },
      source: "EXEX PUBLIC AFFAIRS",
    },
    {
      templateId: "RECOVERY:EXEX:alternate_line",
      semanticPattern: "RECOVERY:EXEX:alternate_line",
      headline: "EXEX restores throughput through alternate extraction line.",
      summary: "Resource flow resumed outside the contested corridor while disclosure review continues.",
      tags: ["extraction", "pipeline", "resource_supply"],
      impacts: { EXEX: 1.5, "PXB-X": 0.8, OPSEC: 0.2 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      templateId: "RECOVERY:EXEX:stabilization_buyback",
      semanticPattern: "RECOVERY:EXEX:stabilization_buyback",
      headline: "EXEX board authorizes stabilization buyback.",
      summary: "The board framed the move as a response to distorted headline risk.",
      tags: ["legal_exposure", "public_visibility"],
      impacts: { EXEX: 1.0, OCI: -0.2 },
      source: "INNER WORLDS MARKET FEED",
    },
    {
      templateId: "RECOVERY:EXEX:liability_call",
      semanticPattern: "RECOVERY:EXEX:liability_call",
      headline: "EXEX investor call narrows guidance after contractor-liability questions.",
      summary: "The recovery call reduced immediate liquidity fear, but counsel flagged corridor indemnity and contractor-separation exposure.",
      tags: ["extraction", "legal_exposure", "security_contract", "public_visibility"],
      impacts: { EXEX: -0.4, OPSEC: -0.2, OCI: 0.3, "PXB-X": 0.1 },
      source: "EXEX PUBLIC AFFAIRS",
    },
  ],
  OPSEC: [
    {
      headline: "OPSEC MUTO system receives blackout-resilience certification.",
      summary: "Defense-tech suppliers moved higher after the certification notice.",
      tags: ["security_contract", "blackout"],
      impacts: { OPSEC: 1.0, ACSB: 0.9 },
      source: "OPSEC STRATEGIC COMMUNICATIONS",
    },
    {
      headline: "Contractor liability inquiry opened into OPSEC corridor activity.",
      summary: "Oversight pressure rose after telemetry requests were denied.",
      tags: ["legal_exposure", "civilian_harm"],
      impacts: { OPSEC: -0.9, ACSB: -0.3, OCI: 0.5 },
      source: "INNER WORLDS MARKET FEED",
    },
  ],
  SYNOPTIC: [
    {
      templateId: "RECOVERY:SYNOPTIC:redacted_stills",
      semanticPattern: "RECOVERY:SYNOPTIC:redacted_stills",
      headline: "SYNOPTIC releases redacted corridor stills.",
      summary: "Verification desks treated the release as partial evidence control rather than full disclosure.",
      tags: ["footage_leak", "data_suppression", "public_visibility"],
      impacts: { SYNOPTIC: 1.0, OCI: -0.2, EXEX: 0.2 },
      source: "SYNOPTIC ACCESS DESK",
    },
    {
      templateId: "RECOVERY:SYNOPTIC:verification_contract",
      semanticPattern: "RECOVERY:SYNOPTIC:verification_contract",
      headline: "SYNOPTIC secures government verification contract.",
      summary: "Strategic demand offset data-suppression accusations.",
      tags: ["footage_leak", "security_contract"],
      impacts: { SYNOPTIC: 1.4, ACSB: 0.3 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      templateId: "RECOVERY:SYNOPTIC:chain_of_custody_cost",
      semanticPattern: "RECOVERY:SYNOPTIC:chain_of_custody_cost",
      headline: "SYNOPTIC verification contract adds chain-of-custody liability reserve.",
      summary: "New demand arrived with archive-audit costs and public questions about why complete passes were not released earlier.",
      tags: ["footage_leak", "data_suppression", "legal_exposure", "public_visibility"],
      impacts: { SYNOPTIC: -0.3, EXEX: -0.2, OCI: 0.3, HALCYON: 0.1 },
      source: "SYNOPTIC ACCESS DESK",
    },
  ],
  LUMEN: [
    {
      headline: "LUMEN relay stabilization succeeds through flare window.",
      summary: "Priority routes held during the latest communications disruption.",
      tags: ["flare", "communications", "blackout"],
      impacts: { LUMEN: 0.9, OCI: -0.2 },
      source: "LUMEN RELAY NOTICE",
    },
    {
      headline: "PSA accuses LUMEN of crisis pricing.",
      summary: "Public pressure rose over non-priority emergency traffic.",
      tags: ["communications", "psa", "public_visibility"],
      impacts: { LUMEN: -0.8, OCI: 0.4 },
      source: "PSA EMERGENCY OFFICE",
    },
  ],
  HALCYON: [
    {
      headline: "Catastrophic payout exposure pressures HALCYON reserves.",
      summary: "Risk desks questioned whether exclusion language can contain the current claims cycle.",
      tags: ["insurance", "legal_exposure", "civilian_harm"],
      impacts: { HALCYON: -1.0, OCI: 0.7 },
      source: "HALCYON RISK DESK",
    },
    {
      headline: "HALCYON and DOMUS announce reconstruction coverage framework.",
      summary: "Coverage clarity reduced near-term claims uncertainty.",
      tags: ["insurance", "reconstruction", "habitat_failure"],
      impacts: { HALCYON: 0.8, DOMUS: 0.6, OCI: -0.2 },
      source: "HALCYON RISK DESK",
    },
  ],
  DOMUS: [
    {
      templateId: "RECOVERY:DOMUS:oxygen_restoration",
      semanticPattern: "RECOVERY:DOMUS:oxygen_restoration",
      headline: "DOMUS restores oxygen loop access after outage.",
      summary: "Service restoration stabilized the civilian infrastructure name after repeated outage headlines.",
      tags: ["habitat_failure", "reconstruction"],
      impacts: { DOMUS: 1.3, OCI: -0.3 },
      source: "DOMUS SERVICE BULLETIN",
    },
    {
      templateId: "RECOVERY:DOMUS:emergency_procurement",
      semanticPattern: "RECOVERY:DOMUS:emergency_procurement",
      headline: "PSA requests emergency habitat procurement.",
      summary: "Procurement visibility improved despite unresolved public trust damage.",
      tags: ["habitat_failure", "reconstruction", "psa"],
      impacts: { DOMUS: 1.2, HALCYON: 0.2 },
      source: "PSA EMERGENCY OFFICE",
    },
    {
      templateId: "RECOVERY:DOMUS:restoration_fragility",
      semanticPattern: "RECOVERY:DOMUS:restoration_fragility",
      headline: "DOMUS restoration notice exposes wider life-support dependency map.",
      summary: "Oxygen access returned, but the service report showed multiple habitats sharing the same brittle backup chain.",
      tags: ["habitat_failure", "reconstruction", "civilian_harm", "public_visibility"],
      impacts: { DOMUS: -0.4, OCI: 0.4, HALCYON: 0.2, LUMEN: -0.1, EXEX: -0.1 },
      source: "DOMUS SERVICE BULLETIN",
    },
  ],
  "PXB-X": [
    {
      templateId: "RECOVERY:PXB-X:resource_vein",
      semanticPattern: "RECOVERY:PXB-X:resource_vein",
      headline: "High-grade Proxima resource vein confirmed below disputed belt.",
      summary: "Resource futures rallied as concentrate scarcity assumptions reset.",
      tags: ["resource_supply", "extraction"],
      impacts: { "PXB-X": 1.2, EXEX: 0.7, OPSEC: 0.2 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      templateId: "RECOVERY:PXB-X:transfer_slot",
      semanticPattern: "RECOVERY:PXB-X:transfer_slot",
      headline: "Anchorpoint clears priority transfer slot for Proxima concentrate.",
      summary: "Delivery confidence improved after transport desks confirmed outbound capacity.",
      tags: ["resource_supply", "transport", "logistics"],
      impacts: { "PXB-X": 1.0, ANCHOR: 0.8, EXEX: 0.4, CARBON: -0.4 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      templateId: "RECOVERY:PXB-X:delivery_confidence_break",
      semanticPattern: "RECOVERY:PXB-X:delivery_confidence_break",
      headline: "PXB-X scarcity rally fades as delivery-confidence desk cuts route assumptions.",
      summary: "Scarcity remained valuable, but transfer uncertainty and insurance haircuts overwhelmed the recovery bid.",
      tags: ["resource_supply", "transport", "logistics", "insurance"],
      impacts: { "PXB-X": -0.4, ANCHOR: -0.2, EXEX: -0.1, OCI: 0.3, CARBON: 0.1 },
      source: "HELLAS CAPITAL DESK",
    },
  ],
  OCI: [
    {
      headline: "Temporary civilian corridor holds through local night cycle.",
      summary: "Stability reduced outer colony risk premium for the first time this window.",
      tags: ["civilian_harm", "unicol", "psa"],
      impacts: { OCI: -0.8, HALCYON: -0.2, OPSEC: -0.2 },
      source: "UNICOL OBSERVER MISSION",
    },
  ],
  ACSB: [
    {
      headline: "Autonomy oversight review pressures combat systems basket.",
      summary: "Suppliers fell after an inquiry into classification logic and blackout operation logs.",
      tags: ["security_contract", "legal_exposure"],
      impacts: { ACSB: -0.8, OPSEC: -0.3 },
      source: "INNER WORLDS MARKET FEED",
    },
  ],
  CARBON: [
    {
      headline: "Carbon Standard wins reserve fuel supply framework.",
      summary: "Legacy energy contracts strengthened as Proxima delivery confidence remained contested.",
      tags: ["fuel_competition", "resource_supply", "safety_review"],
      impacts: { CARBON: 1.0, "PXB-X": -0.4, EXEX: -0.2 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      headline: "Carbon Standard funds independent Proxima concentrate safety review.",
      summary: "Old energy interests framed adoption speed as a stability risk rather than an innovation cycle.",
      tags: ["fuel_competition", "safety_review", "public_visibility"],
      impacts: { CARBON: 0.8, "PXB-X": -0.6, EXEX: -0.3 },
      source: "INNER WORLDS MARKET FEED",
    },
  ],
  ANCHOR: [
    {
      templateId: "RECOVERY:ANCHOR:alternate_route",
      semanticPattern: "RECOVERY:ANCHOR:alternate_route",
      headline: "Anchorpoint confirms alternate transfer route for Proxima shipments.",
      summary: "Freight desks treated route diversity as a partial repair to delivery confidence.",
      tags: ["transport", "logistics", "resource_supply"],
      impacts: { ANCHOR: 1.0, "PXB-X": 0.8, EXEX: 0.4, CARBON: -0.3 },
      source: "HELLAS CAPITAL DESK",
    },
    {
      templateId: "RECOVERY:ANCHOR:hazard_normalization",
      semanticPattern: "RECOVERY:ANCHOR:hazard_normalization",
      headline: "Anchorpoint hazard premium normalizes after cargo-window review.",
      summary: "Shipping capacity improved while insurers reduced immediate route-risk assumptions.",
      tags: ["transport", "insurance", "logistics"],
      impacts: { ANCHOR: 0.8, OCI: -0.4, HALCYON: -0.2, "PXB-X": 0.5 },
      source: "INNER WORLDS MARKET FEED",
    },
    {
      templateId: "RECOVERY:ANCHOR:punitive_hazard_premium",
      semanticPattern: "RECOVERY:ANCHOR:punitive_hazard_premium",
      headline: "Anchorpoint alternate route clears only at punitive hazard premiums.",
      summary: "The corridor technically reopened, but freight insurance and reroute fees damaged the recovery read-through.",
      tags: ["transport", "insurance", "logistics", "resource_supply"],
      impacts: { ANCHOR: -0.3, "PXB-X": -0.2, HALCYON: 0.2, OCI: 0.2, EXEX: -0.1 },
      source: "INNER WORLDS MARKET FEED",
    },
  ],
};

export const createRecoveryEvent = (actorId: MarketInstrumentId): MarketEvent => {
  const template = recoveryEventData[actorId][Math.floor(Math.random() * recoveryEventData[actorId].length)];
  const timestamp = Date.now();

  return {
    id: `recovery-${actorId}-${timestamp}-${Math.floor(Math.random() * 1000)}`,
    templateId: template.templateId,
    category: "Market Note",
    tags: template.tags,
    headline: template.headline,
    summary: template.summary,
    involvedActors: [actorId, ...Object.keys(template.impacts).filter((id) => id !== actorId)] as MarketEvent["involvedActors"],
    impacts: template.impacts,
    institutionImpacts: {},
    mediaSnippet: template.summary,
    severity: "warning",
    source: template.source,
    timestamp,
    generated: true,
    triggeredRecovery: true,
    storylineId: activeStoryline.id,
    phase: "Countermeasure / Recovery",
    semanticPattern: template.semanticPattern,
  };
};

export const explainRecentMove = (
  actorId: MarketInstrumentId,
  history: MarketHistoryPoint[],
  events: MarketEvent[],
) => {
  const visible = history.slice(-36);
  const first = visible[0];
  const last = visible[visible.length - 1];
  if (!first || !last) return "No current-window movement is available yet.";

  const instrument = marketInstruments.find((item) => item.id === actorId) ?? marketInstruments[0];
  const change = safePercentChange(last.value, first.value, actorId, instrument.basePrice);
  const related = events
    .filter((event) => event.involvedActors.includes(actorId))
    .slice(0, 8);
  const tagCounts = new Map<string, number>();
  let recoveryCount = 0;
  let circuitCount = 0;

  for (const event of related) {
    for (const tag of event.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    if (event.triggeredRecovery) recoveryCount += 1;
    if (event.triggeredCircuitBreaker) circuitCount += 1;
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag.replace(/_/g, " "));

  const direction = change >= 0 ? "up" : "down";
  const drivers = topTags.length ? topTags.join(", ") : "ambient market movement";
  const recoveryLine = recoveryCount
    ? ` Recovery/countermeasure events appeared ${recoveryCount} time${recoveryCount === 1 ? "" : "s"} in the window.`
    : " Recovery attempts have not yet materially offset the current pressure.";
  const circuitLine = circuitCount ? " A trading halt or disclosure review was triggered during this window." : "";

  const pricedInCount = related.filter((event) => event.pricedInResponse).length;
  const pricedInLine = pricedInCount
    ? ` Repeated similar headlines are now partially priced in.`
    : "";

  return `${actorId} is ${direction} ${Math.abs(change).toFixed(1)}% over the current window. The move is mainly associated with ${drivers}.${recoveryLine}${circuitLine}${pricedInLine}`;
};

const impactLines = (impacts: Record<string, number> | Partial<Record<MarketInstrumentId, number>>) =>
  Object.entries(impacts)
    .map(([id, value]) => `  - ${id}: ${Number(value).toFixed(1)}%`)
    .join("\n");

export type MarketExportMode = "clean" | "debug";

type EventBasketDiagnostic = {
  event: MarketEvent;
  label: string;
  positiveImpactSum: number;
  negativeImpactSum: number;
  netImpactSum: number;
  positiveInstrumentCount: number;
  negativeInstrumentCount: number;
  flatInstrumentCount: number;
  largestPositive?: { id: MarketInstrumentId; value: number };
  largestNegative?: { id: MarketInstrumentId; value: number };
};

const DRIFT_WINDOW_SIZE = 20;
const GREEN_DRIFT_AVERAGE_THRESHOLD = 0.1;
const GREEN_DRIFT_WINNER_RATIO = 1.5;

const formatSignedDiagnostic = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

const eventDiagnosticLabel = (event: MarketEvent) => event.semanticPattern ?? event.templateId ?? event.headline;

const calculateEventBasketDiagnostic = (event: MarketEvent): EventBasketDiagnostic => {
  const entries = marketInstruments.map((instrument) => ({
    id: instrument.id,
    value: Number((event.impacts[instrument.id] ?? 0).toFixed(2)),
  }));
  const positives = entries.filter(({ value }) => value > 0);
  const negatives = entries.filter(({ value }) => value < 0);
  const positiveImpactSum = positives.reduce((sum, { value }) => sum + value, 0);
  const negativeImpactSum = negatives.reduce((sum, { value }) => sum + value, 0);
  const largestPositive = [...positives].sort((a, b) => b.value - a.value)[0];
  const largestNegative = [...negatives].sort((a, b) => a.value - b.value)[0];

  return {
    event,
    label: eventDiagnosticLabel(event),
    positiveImpactSum: Number(positiveImpactSum.toFixed(2)),
    negativeImpactSum: Number(negativeImpactSum.toFixed(2)),
    netImpactSum: Number((positiveImpactSum + negativeImpactSum).toFixed(2)),
    positiveInstrumentCount: positives.length,
    negativeInstrumentCount: negatives.length,
    flatInstrumentCount: entries.length - positives.length - negatives.length,
    largestPositive,
    largestNegative,
  };
};

const aggregateBasketDiagnostics = (diagnostics: EventBasketDiagnostic[]) => {
  const netSum = diagnostics.reduce((sum, item) => sum + item.netImpactSum, 0);
  const positiveSum = diagnostics.reduce((sum, item) => sum + item.positiveImpactSum, 0);
  const negativeSum = diagnostics.reduce((sum, item) => sum + item.negativeImpactSum, 0);

  return {
    averageEventNet: diagnostics.length ? Number((netSum / diagnostics.length).toFixed(2)) : 0,
    positiveSum: Number(positiveSum.toFixed(2)),
    negativeSum: Number(negativeSum.toFixed(2)),
    winnerCount: diagnostics.reduce((sum, item) => sum + item.positiveInstrumentCount, 0),
    loserCount: diagnostics.reduce((sum, item) => sum + item.negativeInstrumentCount, 0),
    flatCount: diagnostics.reduce((sum, item) => sum + item.flatInstrumentCount, 0),
  };
};

const eventBasketDiagnosticLines = (diagnostic: EventBasketDiagnostic) => {
  const largestPositive = diagnostic.largestPositive
    ? `${diagnostic.largestPositive.id} ${formatSignedDiagnostic(diagnostic.largestPositive.value)}`
    : "none";
  const largestNegative = diagnostic.largestNegative
    ? `${diagnostic.largestNegative.id} ${formatSignedDiagnostic(diagnostic.largestNegative.value)}`
    : "none";

  return [
    `Event basket net: ${formatSignedDiagnostic(diagnostic.netImpactSum)}`,
    `Positive instruments: ${diagnostic.positiveInstrumentCount}; negative instruments: ${diagnostic.negativeInstrumentCount}; flat instruments: ${diagnostic.flatInstrumentCount}`,
    `Positive impact sum: ${formatSignedDiagnostic(diagnostic.positiveImpactSum)}; negative impact sum: ${formatSignedDiagnostic(diagnostic.negativeImpactSum)}`,
    `Largest positive: ${largestPositive}`,
    `Largest negative: ${largestNegative}`,
  ];
};

const basketDriftDiagnostics = (
  diagnostics: EventBasketDiagnostic[],
  marketRegime: MarketRegime,
  unresolvedItems: string[],
) => {
  const rolling = diagnostics.slice(-DRIFT_WINDOW_SIZE);
  const rollingSummary = aggregateBasketDiagnostics(rolling);
  const sessionSummary = aggregateBasketDiagnostics(diagnostics);
  const greenDriftWarning =
    rollingSummary.averageEventNet > GREEN_DRIFT_AVERAGE_THRESHOLD &&
    rollingSummary.winnerCount > rollingSummary.loserCount * GREEN_DRIFT_WINNER_RATIO &&
    marketRegime !== "RECOVERY" &&
    unresolvedItems.length > 0;
  const topPositive = [...rolling].sort((a, b) => b.netImpactSum - a.netImpactSum).slice(0, 5);
  const topNegative = [...rolling].sort((a, b) => a.netImpactSum - b.netImpactSum).slice(0, 5);
  const archetypeMap = new Map<string, { count: number; total: number }>();

  for (const diagnostic of diagnostics) {
    const current = archetypeMap.get(diagnostic.label) ?? { count: 0, total: 0 };
    archetypeMap.set(diagnostic.label, {
      count: current.count + 1,
      total: Number((current.total + diagnostic.netImpactSum).toFixed(2)),
    });
  }

  const archetypeSummary = [...archetypeMap.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      total: value.total,
      average: Number((value.total / value.count).toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 10);

  return {
    rollingCount: rolling.length,
    rollingSummary,
    sessionSummary,
    greenDriftWarning,
    topPositive,
    topNegative,
    archetypeSummary,
  };
};

const driftDirectorNoteLines = (diagnostics: ReturnType<typeof basketDriftDiagnostics>) => [
  `Basket drift: rolling average event net ${formatSignedDiagnostic(diagnostics.rollingSummary.averageEventNet)} across last ${diagnostics.rollingCount} events.`,
  `Basket drift: rolling winner/loser/flat counts ${diagnostics.rollingSummary.winnerCount} / ${diagnostics.rollingSummary.loserCount} / ${diagnostics.rollingSummary.flatCount}.`,
  diagnostics.greenDriftWarning
    ? `Green drift warning: yes - rolling event net is ${formatSignedDiagnostic(diagnostics.rollingSummary.averageEventNet)} while storyline remains unresolved.`
    : "Green drift warning: no.",
];

const driftDiagnosticSectionLines = (diagnostics: ReturnType<typeof basketDriftDiagnostics>) => [
  `## Debug Basket Drift Diagnostics`,
  `Window size: ${DRIFT_WINDOW_SIZE} events`,
  `Rolling average event net: ${formatSignedDiagnostic(diagnostics.rollingSummary.averageEventNet)}`,
  `Rolling positive sum: ${formatSignedDiagnostic(diagnostics.rollingSummary.positiveSum)}`,
  `Rolling negative sum: ${formatSignedDiagnostic(diagnostics.rollingSummary.negativeSum)}`,
  `Rolling winner/loser/flat counts: ${diagnostics.rollingSummary.winnerCount} / ${diagnostics.rollingSummary.loserCount} / ${diagnostics.rollingSummary.flatCount}`,
  `Session average event net: ${formatSignedDiagnostic(diagnostics.sessionSummary.averageEventNet)}`,
  `Session positive sum: ${formatSignedDiagnostic(diagnostics.sessionSummary.positiveSum)}`,
  `Session negative sum: ${formatSignedDiagnostic(diagnostics.sessionSummary.negativeSum)}`,
  diagnostics.greenDriftWarning
    ? `Green drift warning: yes - rolling event net is ${formatSignedDiagnostic(diagnostics.rollingSummary.averageEventNet)} across last ${diagnostics.rollingCount} events while storyline remains unresolved.`
    : "Green drift warning: no.",
  ``,
  `### Top net-positive recent events`,
  ...(diagnostics.topPositive.length
    ? diagnostics.topPositive.map((item) => `- ${item.label}: ${formatSignedDiagnostic(item.netImpactSum)}`)
    : ["- none"]),
  ``,
  `### Top net-negative recent events`,
  ...(diagnostics.topNegative.length
    ? diagnostics.topNegative.map((item) => `- ${item.label}: ${formatSignedDiagnostic(item.netImpactSum)}`)
    : ["- none"]),
  ``,
  `### Archetype net impact summary`,
  ...(diagnostics.archetypeSummary.length
    ? diagnostics.archetypeSummary.map(
        (item) => `- ${item.label}: count ${item.count}, avg net ${formatSignedDiagnostic(item.average)}, total ${formatSignedDiagnostic(item.total)}`,
      )
    : ["- none"]),
  ``,
];

const recoveryDiagnosticSectionLines = (diagnostics: EventBasketDiagnostic[]) => {
  const recoveryDiagnostics = diagnostics.filter((diagnostic) => diagnostic.event.triggeredRecovery);
  const recoverySummary = aggregateBasketDiagnostics(recoveryDiagnostics);
  const byActor = new Map<string, number>();
  const topPositive = [...recoveryDiagnostics].sort((a, b) => b.netImpactSum - a.netImpactSum).slice(0, 5);
  const topNegative = [...recoveryDiagnostics].sort((a, b) => a.netImpactSum - b.netImpactSum).slice(0, 5);

  for (const diagnostic of recoveryDiagnostics) {
    const primary = diagnostic.event.involvedActors[0] ?? "UNKNOWN";
    byActor.set(primary, (byActor.get(primary) ?? 0) + 1);
  }

  return [
    `## Recovery Event Diagnostics`,
    `Recovery events in session: ${recoveryDiagnostics.length}`,
    `Recovery events by actor: ${
      byActor.size ? [...byActor.entries()].map(([actor, count]) => `${actor} ${count}`).join(", ") : "none"
    }`,
    `Recovery event average net: ${formatSignedDiagnostic(recoverySummary.averageEventNet)}`,
    ``,
    `### Top positive recovery events`,
    ...(topPositive.length ? topPositive.map((item) => `- ${item.label}: ${formatSignedDiagnostic(item.netImpactSum)}`) : ["- none"]),
    ``,
    `### Top negative recovery events`,
    ...(topNegative.length ? topNegative.map((item) => `- ${item.label}: ${formatSignedDiagnostic(item.netImpactSum)}`) : ["- none"]),
    ``,
  ];
};

const formatLaneCount = (count: number) => (Number.isInteger(count) ? count.toFixed(0) : count.toFixed(1));

const cleanNarrativeLaneLines = (summary: ReturnType<typeof summarizeStorylineLanes>) => [
  `Active narrative lanes:`,
  ...(summary.activeLanes.length
    ? summary.activeLanes
        .slice(0, 3)
        .map(({ lane, status }) => `- ${lane.title} - ${status}`)
    : ["- Corridor 12-B Licensing Dispute - active"]),
];

const narrativeLaneDiagnosticSectionLines = (summary: ReturnType<typeof summarizeStorylineLanes>, unresolvedItems: string[]) => [
  `## Narrative Lane Diagnostics`,
  `Dominant lane: ${summary.dominantLane?.title ?? "none"}`,
  `Active lanes: ${summary.activeLanes.length ? summary.activeLanes.map(({ lane }) => lane.title).join(", ") : "none"}`,
  `Unresolved pressure: ${unresolvedItems.join(", ") || "none"}`,
  ``,
  `### Lane counts`,
  ...(summary.laneCounts.length
    ? summary.laneCounts.map(({ lane, count }) => `- ${lane.title}: ${formatLaneCount(count)} events`)
    : ["- none"]),
  ``,
  `### Top repeated lane/pattern pairs`,
  ...(summary.topPatternPairs.length
    ? summary.topPatternPairs.map(({ lane, pattern, count }) => `- ${lane.title} / ${pattern}: ${count}`)
    : ["- none"]),
  ``,
  `### Recent lane transitions`,
  ...(summary.recentTransitions.length ? summary.recentTransitions.map((transition) => `- ${transition}`) : ["- none"]),
  ``,
];

export const exportSessionMarkdown = ({
  market,
  institutionsState,
  events,
  publicPulsePosts = [],
  actorId,
  marketStatus,
  marketRegime = "NORMAL",
  exportMode = "clean",
}: {
  market: MarketState;
  institutionsState: InstitutionState;
  events: MarketEvent[];
  publicPulsePosts?: SocialPost[];
  actorId?: MarketInstrumentId;
  marketStatus: string;
  marketRegime?: MarketRegime;
  exportMode?: MarketExportMode;
}) => {
  const relevantEvents = actorId ? events.filter((event) => event.involvedActors.includes(actorId)) : events;
  const isDebugExport = exportMode === "debug";
  const generatedAt = new Date().toLocaleString();
  const orderedEvents = [...relevantEvents].sort((a, b) => (a.simulatedTimestamp ?? 0) - (b.simulatedTimestamp ?? 0));
  const eventDiagnostics = orderedEvents.map(calculateEventBasketDiagnostic);
  const eventDiagnosticsById = new Map(eventDiagnostics.map((diagnostic) => [diagnostic.event.id, diagnostic]));
  const driftDiagnostics = basketDriftDiagnostics(eventDiagnostics, marketRegime, activeStoryline.unresolved);
  const narrativeLaneSummary = summarizeStorylineLanes(orderedEvents);
  const eventById = new Map(orderedEvents.map((event) => [event.id, event]));
  const simulatedEvents = orderedEvents.filter((event) => event.simulatedLabel);
  const simulatedTimeRange = simulatedEvents.length
    ? `${simulatedEvents[0].simulatedLabel} -> ${simulatedEvents[simulatedEvents.length - 1].simulatedLabel}`
    : "No simulated events recorded.";
  const currentMoves = marketInstruments.map((instrument) => {
    const point = market[instrument.id];
    const history = point.history.slice(-48);
    const first = history[0];
    const last = history[history.length - 1];
    const move = first && last ? safePercentChange(last.value, first.value, instrument.id, instrument.basePrice) : 0;
    return { instrument, point, move, latest: last };
  });
  const winners = [...currentMoves].filter((item) => item.move > 0).sort((a, b) => b.move - a.move).slice(0, 4);
  const losers = [...currentMoves].filter((item) => item.move < 0).sort((a, b) => a.move - b.move).slice(0, 4);
  const tagCounts = new Map<string, number>();
  const beneficiaryCounts = new Map<string, number>();
  for (const event of relevantEvents.slice(0, 80)) {
    for (const tag of event.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    for (const [id, impact] of Object.entries(event.impacts)) {
      if ((impact ?? 0) > 0.1) beneficiaryCounts.set(id, (beneficiaryCounts.get(id) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag);
  const topBeneficiaries = [...beneficiaryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const summary =
    `The session is in ${marketRegime.replace(/_/g, " ").toLowerCase()} regime. ` +
    `${regimeDescription(marketRegime)} ` +
    `Main pressure tags: ${topTags.join(", ") || "ambient movement"}. ` +
    `Main beneficiaries: ${topBeneficiaries.join(", ") || "none yet"}.`;
  const likelyNextPhase =
    marketRegime === "PANIC" || marketRegime === "HALTED_REVIEW"
      ? "Disclosure review, halt news, or emergency countermeasure."
      : marketRegime === "RECOVERY"
        ? "Verification, settlement framework, or reconstruction follow-through."
        : marketRegime === "MANAGED_PLATEAU"
          ? "Managed containment unless enforcement, legal, or public-visibility pressure breaks the range."
        : marketRegime === "DEGRADED_STABILITY"
          ? "Stabilized crisis plateau unless a new leak or transport failure breaks the range."
          : "Further Corridor 12-B pressure or a controlled de-escalation signal.";
  const directorNotes = summarizeDirectorSession({
    market,
    institutionsState,
    events: relevantEvents,
    marketRegime,
    activeStorylinePhase: activeStoryline.phase,
    debug: isDebugExport,
  });
  const publicPulseSummary = summarizePublicPulse(publicPulsePosts);
  const majorMovements = [...currentMoves]
    .filter(({ latest }) => !!latest)
    .sort((a, b) => Math.abs(b.move) - Math.abs(a.move))
    .slice(0, 6)
    .map(({ instrument, move, point, latest }) => {
      const note = latest?.note ?? point.headline;
      return `- ${instrument.id}: ${formatCappedPercent(move)} over current window; status ${point.marketStatus}; ${note}`;
    });

  return [
    `# Corporate Codex Market Session`,
    ``,
    `Generated: ${generatedAt}`,
    `Market status: ${marketStatus}`,
    `Market regime: ${marketRegime}`,
    `Regime read: ${regimeDescription(marketRegime)}`,
    actorId ? `Scope: ${actorId}` : `Scope: all actors`,
    `Export mode: ${exportMode}`,
    `Simulated time range: ${simulatedTimeRange}`,
    ``,
    `## What Happened`,
    summary,
    ``,
    `Likely next phase: ${likelyNextPhase}`,
    ``,
    ...cleanNarrativeLaneLines(narrativeLaneSummary),
    ``,
    `## Director Notes`,
    ...directorNotes.map((note) => `- ${note}`),
    ...(isDebugExport ? driftDirectorNoteLines(driftDiagnostics).map((note) => `- ${note}`) : []),
    ``,
    `## Current Market Values`,
    ...marketInstruments.map((instrument) => {
      const point = market[instrument.id];
      const latest = point.history[point.history.length - 1];
      return `- ${instrument.id} / ${instrument.fullName}: ${latest.value.toFixed(2)} (${point.marketStatus})`;
    }),
    ``,
    `## Institution Metrics`,
    ...institutions.map((institution: Institution) => {
      const current = institutionsState[institution.id];
      return `- ${institution.id}: credibility ${Math.round(current.credibility)}%, operational ${Math.round(current.operationalCapacity)}%, enforcement ${Math.round(current.enforcementCapacity)}%, trust ${Math.round(current.publicTrust)}%`;
    }),
    ``,
    `## Biggest Winners / Losers`,
    `Winners: ${winners.length ? winners.map(({ instrument, move }) => `${instrument.id} ${formatCappedPercent(move)}`).join(", ") : "No positive movers."}`,
    `Losers: ${losers.length ? losers.map(({ instrument, move }) => `${instrument.id} ${formatCappedPercent(move)}`).join(", ") : "No negative movers."}`,
    ``,
    `## Main Pressure Tags`,
    topTags.length ? topTags.map((tag) => `- ${tag}: ${tagCounts.get(tag)}`).join("\n") : "- none",
    ``,
    `## Main Beneficiaries`,
    topBeneficiaries.length ? topBeneficiaries.map((id) => `- ${id}: ${beneficiaryCounts.get(id)} positive event references`).join("\n") : "- none",
    ``,
    `## Public Pulse`,
    `- dominant sentiment: ${publicPulseSummary.dominantSentiment}`,
    `- most active topics: ${publicPulseSummary.mostActiveTopics.join(", ") || "quiet"}`,
    `- sample posts:`,
    ...(publicPulseSummary.samplePosts.length
      ? publicPulseSummary.samplePosts.map((post) => `  - ${post.handle}: "${post.text}"`)
      : ["  - none"]),
    ...(isDebugExport
      ? [
          `- recent post count: ${publicPulseSummary.recentPostCount}`,
          `- top persona types: ${publicPulseSummary.topPersonaTypes.join(", ") || "none"}`,
          `- top sentiment tags: ${publicPulseSummary.topSentimentTags.join(", ") || "none"}`,
          `- saturation contributions: ${publicPulseSummary.saturationContributions.join(", ") || "none"}`,
          `- selection notes: ${publicPulseSummary.selectionNotes.join(" | ") || "none"}`,
          `- recent related events: ${
            publicPulsePosts
              .slice(0, 8)
              .map((post) => `${post.handle} -> ${post.relatedEventId ?? "ambient"}`)
              .join(", ") || "none"
          }`,
          `- recent related lanes: ${
            publicPulsePosts
              .slice(0, 8)
              .map((post) => {
                const relatedEvent = post.relatedEventId ? eventById.get(post.relatedEventId) : undefined;
                return relatedEvent ? `${post.handle} -> ${classifyEventStorylineLanes(relatedEvent).primaryLaneTitle}` : `${post.handle} -> ambient`;
              })
              .join(", ") || "none"
          }`,
        ]
      : []),
    ``,
    `## Active Storyline`,
    `${activeStoryline.title}`,
    `Phase: ${activeStoryline.phase}`,
    `Primary pressure: ${activeStoryline.primaryPressure}`,
    `Beneficiaries: ${activeStoryline.beneficiaries.join(", ")}`,
    `Unresolved: ${activeStoryline.unresolved.join(", ")}`,
    ``,
    ...(isDebugExport ? narrativeLaneDiagnosticSectionLines(narrativeLaneSummary, activeStoryline.unresolved) : []),
    ...(isDebugExport ? driftDiagnosticSectionLines(driftDiagnostics) : []),
    ...(isDebugExport ? recoveryDiagnosticSectionLines(eventDiagnostics) : []),
    `## Market Timeline`,
    ...orderedEvents.slice(-60).flatMap((event) => [
      ``,
      `### ${event.simulatedLabel ?? new Date(event.timestamp ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${event.headline}`,
      ``,
      event.summary,
      ``,
      `Source: ${event.source ?? event.category}`,
      `Category: ${event.category}`,
      event.phase ? `Phase: ${event.phase}` : "",
      event.marketRegime ? `Regime: ${event.marketRegime}` : "",
      isDebugExport ? `Narrative lane: ${classifyEventStorylineLanes(event).primaryLaneTitle}` : "",
      isDebugExport && event.semanticPattern ? `Semantic pattern: ${event.semanticPattern}` : "",
      isDebugExport && event.noveltyScore !== undefined ? `Novelty score: ${event.noveltyScore.toFixed(2)}` : "",
      `Tags: ${event.tags.join(", ")}`,
      `Affected: ${event.involvedActors.join(", ")}`,
      event.triggeredCircuitBreaker ? `Circuit breaker: yes` : "",
      event.triggeredRecovery ? `Recovery/countermeasure: yes` : "",
      event.pricedInResponse ? `Priced-in response: yes` : "",
      `Impacts:`,
      impactLines(event.impacts) || "  - none",
      ...(isDebugExport ? eventBasketDiagnosticLines(eventDiagnosticsById.get(event.id) ?? calculateEventBasketDiagnostic(event)) : []),
      isDebugExport && event.marketStateNote ? `Market state: ${event.marketStateNote}` : "",
      isDebugExport && event.directorNotes?.length ? `Director: ${event.directorNotes.join(" ")}` : "",
      event.publicReaction ? `Public reaction: ${event.publicReaction}` : "",
    ].filter(Boolean)),
    ``,
    `## Major Price Movements`,
    ...(majorMovements.length ? majorMovements : ["- No current-window price movements recorded."]),
  ].join("\n");
};
