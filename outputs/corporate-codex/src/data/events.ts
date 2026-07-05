import type { InstitutionId, MarketInstrumentId } from "./entities";

export type EventCategory =
  | "Breaking"
  | "Market Note"
  | "Official Statement"
  | "Observer Update"
  | "PSA Directive"
  | "Public Reaction"
  | "Leak"
  | "Analyst Note";

export type EventTag =
  | "extraction"
  | "pipeline"
  | "sabotage"
  | "civilian_harm"
  | "unicol"
  | "psa"
  | "flare"
  | "communications"
  | "insurance"
  | "security_contract"
  | "footage_leak"
  | "legal_exposure"
  | "public_visibility"
  | "reconstruction"
  | "blackout"
  | "resource_supply"
  | "data_suppression"
  | "habitat_failure"
  | "fuel_competition"
  | "transport"
  | "safety_review"
  | "logistics"
  | "verified_access"
  | "oversight"
  | "partial_admission"
  | "denial";

export type InstitutionImpact = Partial<{
  credibility: number;
  operationalCapacity: number;
  enforcementCapacity: number;
  mandateIntegrity: number;
  publicTrust: number;
  signalAccess: number;
  latestStatement: string;
  recentDirective: string;
  currentStatus: string;
}>;

export type MarketEvent = {
  id: string;
  category: EventCategory;
  tags: EventTag[];
  headline: string;
  summary: string;
  involvedActors: Array<MarketInstrumentId | InstitutionId>;
  impacts: Partial<Record<MarketInstrumentId, number>>;
  institutionImpacts: Partial<Record<InstitutionId, InstitutionImpact>>;
  mediaSnippet: string;
  publicReaction?: string;
  severity: "notice" | "warning" | "material";
  source?: string;
  timestamp?: number;
  generated?: boolean;
  publicVisibilityDelta?: number;
  legalExposureDelta?: number;
  storylineId?: string;
  phase?: string;
  triggeredCircuitBreaker?: boolean;
  triggeredRecovery?: boolean;
  pricedInResponse?: boolean;
  marketStateNote?: string;
  templateId?: string;
  simulatedTimestamp?: number;
  simulatedLabel?: string;
  marketRegime?: string;
};

export const eventTemplates: MarketEvent[] = [
  {
    id: "post-12b-contact-loss",
    category: "Observer Update",
    tags: ["unicol", "civilian_harm", "blackout", "public_visibility"],
    headline: "UNICOL Post 12-B loses contact during corridor dispute.",
    summary: "Observer telemetry stopped while civilian access remained restricted.",
    involvedActors: ["UNICOL", "OPSEC", "EXEX", "OCI", "HALCYON"],
    impacts: { EXEX: -1.2, OPSEC: 1.1, OCI: 1.6, HALCYON: 1.2, SYNOPTIC: 0.4 },
    institutionImpacts: {
      UNICOL: {
        credibility: -4,
        operationalCapacity: -3,
        publicTrust: -3,
        latestStatement: "Mission calls for restraint after loss of contact with Post 12-B.",
      },
    },
    mediaSnippet: "Observer loss raises public visibility risk. EXEX -1.2%, OPSEC +1.1%, OCI +1.6%.",
    publicReaction: "UNICOL has perfected the art of arriving as a PDF.",
    severity: "material",
  },
  {
    id: "exex-corridor-secured",
    category: "Market Note",
    tags: ["extraction", "pipeline", "security_contract", "resource_supply"],
    headline: "EXEX secures disputed extraction corridor after security-provider review.",
    summary: "Licensed throughput resumes, while PSA objections remain administratively active.",
    involvedActors: ["EXEX", "OPSEC", "PXB-X", "PSA"],
    impacts: { EXEX: 1.7, OPSEC: 0.6, "PXB-X": 1.3, OCI: 0.2, DOMUS: -0.2 },
    institutionImpacts: {
      PSA: {
        enforcementCapacity: -1,
        publicTrust: -2,
        latestStatement: "Authority contests corridor clearance and requests filing review.",
      },
    },
    mediaSnippet: "Pipeline continuity restores extraction pricing. EXEX +1.7%, PXB-X +1.3%.",
    severity: "warning",
  },
  {
    id: "thermal-footage-leak",
    category: "Leak",
    tags: ["footage_leak", "civilian_harm", "public_visibility", "legal_exposure"],
    headline: "Thermal footage leak raises questions around civilian corridor activity.",
    summary: "Unverified imagery circulates before official incident language is agreed.",
    involvedActors: ["SYNOPTIC", "EXEX", "UNICOL", "OCI"],
    impacts: { EXEX: -1.8, SYNOPTIC: 0.9, OCI: 1.4, HALCYON: 1.1, OPSEC: 0.3 },
    institutionImpacts: {
      UNICOL: { credibility: -2, publicTrust: -2, signalAccess: 1 },
      PSA: { publicTrust: -1 },
    },
    mediaSnippet: "Thermal footage leak raises public visibility risk. EXEX -1.8%, OCI +1.4%, SYNOPTIC +0.9%.",
    publicReaction: "Every time they say unresolved thermal signatures, a lawyer gets promoted.",
    severity: "material",
  },
  {
    id: "opsec-frontier-contracts",
    category: "Official Statement",
    tags: ["security_contract", "sabotage", "blackout"],
    headline: "OPSEC announces new frontier continuity contracts.",
    summary: "Continuity guarantees expand to relay windows, extraction corridors, and unmanned perimeter assurance.",
    involvedActors: ["OPSEC", "ACSB", "EXEX"],
    impacts: { OPSEC: 1.9, ACSB: 1.2, EXEX: 0.3, OCI: 0.4 },
    institutionImpacts: {},
    mediaSnippet: "Security contract demand lifts OPSEC and ACSB. OPSEC +1.9%, ACSB +1.2%.",
    severity: "notice",
  },
  {
    id: "proxima-flare-relay-window",
    category: "Breaking",
    tags: ["flare", "communications", "blackout", "insurance"],
    headline: "Proxima flare disrupts relay windows; priority bandwidth repriced.",
    summary: "Lumen raises priority relay pricing while low-tier settlement traffic degrades.",
    involvedActors: ["LUMEN", "OCI", "UNICOL", "PSA"],
    impacts: { LUMEN: 1.8, OCI: 1.1, HALCYON: 0.8, "PXB-X": 0.5, DOMUS: -0.4 },
    institutionImpacts: {
      UNICOL: { operationalCapacity: -3, signalAccess: -5 },
      PSA: { publicTrust: -3, signalAccess: -4 },
    },
    mediaSnippet: "Relay scarcity reprices communications risk. LUMEN +1.8%, OCI +1.1%.",
    publicReaction: "Turns out emergency communication has surge pricing.",
    severity: "warning",
  },
  {
    id: "psa-emergency-directive",
    category: "PSA Directive",
    tags: ["psa", "legal_exposure", "civilian_harm"],
    headline: "PSA issues emergency directive for Corridor 12-B; enforcement unavailable.",
    summary: "The market largely ignores the directive, but legal exposure ticks higher around EXEX concessions.",
    involvedActors: ["PSA", "EXEX", "DOMUS", "PXB-X"],
    impacts: { EXEX: -0.4, DOMUS: -0.3, "PXB-X": -0.2, OCI: 0.3 },
    institutionImpacts: {
      PSA: {
        enforcementCapacity: -1,
        publicTrust: -2,
        latestStatement: "Emergency directive issued for Corridor 12-B. Enforcement unavailable.",
      },
    },
    mediaSnippet: "PSA directive adds paperwork risk. EXEX -0.4%, OCI +0.3%.",
    severity: "notice",
  },
  {
    id: "synoptic-imagery-withheld",
    category: "Leak",
    tags: ["data_suppression", "footage_leak", "legal_exposure", "public_visibility"],
    headline: "SYNOPTIC corridor imagery withheld under legal review.",
    summary: "Verification clients demand access to thermal passes while Synoptic cites confidentiality restrictions.",
    involvedActors: ["SYNOPTIC", "EXEX", "UNICOL"],
    impacts: { SYNOPTIC: -1.4, EXEX: -0.6, OCI: 0.7, HALCYON: 0.4 },
    institutionImpacts: {
      UNICOL: { signalAccess: -2, credibility: -1 },
    },
    mediaSnippet: "Data suppression headline pressures SYNOPTIC and raises risk pricing. SYNOPTIC -1.4%, OCI +0.7%.",
    publicReaction: "Nothing happens off-record unless the record is under legal review.",
    severity: "material",
  },
  {
    id: "lumen-relay-failure",
    category: "Breaking",
    tags: ["communications", "blackout", "flare", "civilian_harm"],
    headline: "LUMEN relay failure extends settlement blackout window.",
    summary: "Priority traffic clears, but public channels remain degraded near civilian corridors.",
    involvedActors: ["LUMEN", "PSA", "UNICOL", "DOMUS"],
    impacts: { LUMEN: -1.7, OCI: 1.2, HALCYON: 0.9, DOMUS: -0.7, SYNOPTIC: -0.2 },
    institutionImpacts: {
      UNICOL: { operationalCapacity: -2, signalAccess: -4 },
      PSA: { publicTrust: -3, signalAccess: -4 },
    },
    mediaSnippet: "Relay failure widens blackout risk. LUMEN -1.7%, OCI +1.2%, DOMUS -0.7%.",
    severity: "warning",
  },
  {
    id: "halcyon-recognition-delay",
    category: "Analyst Note",
    tags: ["insurance", "civilian_harm", "legal_exposure"],
    headline: "HALCYON delays fatality recognition pending signal confirmation.",
    summary: "Underwriters reprice recoverability assumptions while families remain outside the accounting event.",
    involvedActors: ["HALCYON", "OCI", "UNICOL"],
    impacts: { HALCYON: 1.2, OCI: 1.0, DOMUS: -0.3 },
    institutionImpacts: {
      UNICOL: { publicTrust: -1 },
      PSA: { publicTrust: -1 },
    },
    mediaSnippet: "Recognition delay supports underwriters. HALCYON +1.2%, OCI +1.0%.",
    publicReaction: "The market found a way to make missing people bullish.",
    severity: "material",
  },
  {
    id: "domus-water-loop-failure",
    category: "Breaking",
    tags: ["habitat_failure", "civilian_harm", "reconstruction", "insurance"],
    headline: "DOMUS water-loop outage affects two provisional habitats.",
    summary: "Infrastructure damage pressures Domus, but reconstruction contract expectations limit the selloff.",
    involvedActors: ["DOMUS", "PSA", "HALCYON", "OCI"],
    impacts: { DOMUS: -1.5, HALCYON: 0.7, OCI: 0.9, LUMEN: 0.2 },
    institutionImpacts: {
      PSA: { publicTrust: -3, enforcementCapacity: -1 },
    },
    mediaSnippet: "Habitat failure lifts risk indexes while DOMUS sells off. DOMUS -1.5%, OCI +0.9%.",
    severity: "material",
  },
  {
    id: "domus-reconstruction-contract",
    category: "Market Note",
    tags: ["reconstruction", "habitat_failure", "psa"],
    headline: "DOMUS awarded emergency reconstruction framework after habitat outage.",
    summary: "Civilian infrastructure failure converts into procurement visibility.",
    involvedActors: ["DOMUS", "PSA", "HALCYON"],
    impacts: { DOMUS: 1.6, HALCYON: 0.3, OCI: -0.2 },
    institutionImpacts: {
      PSA: { publicTrust: -1, credibility: -1 },
    },
    mediaSnippet: "Reconstruction framework turns habitat damage into revenue guidance. DOMUS +1.6%.",
    publicReaction: "Life as subscription, reconstruction as upgrade path.",
    severity: "warning",
  },
  {
    id: "resource-pipeline-sabotage",
    category: "Breaking",
    tags: ["pipeline", "sabotage", "resource_supply", "security_contract"],
    headline: "Resource pipeline sabotage reported near Proxima concentrate transfer station.",
    summary: "Supply disruption pressures extraction continuity and raises security demand.",
    involvedActors: ["EXEX", "OPSEC", "PXB-X", "OCI"],
    impacts: { EXEX: -1.0, OPSEC: 1.4, "PXB-X": 1.7, OCI: 0.9, ACSB: 0.6 },
    institutionImpacts: {
      PSA: { enforcementCapacity: -1 },
      UNICOL: { operationalCapacity: -1 },
    },
    mediaSnippet: "Pipeline sabotage reprices supply and security. PXB-X +1.7%, OPSEC +1.4%, EXEX -1.0%.",
    severity: "material",
  },
  {
    id: "unicol-funding-motion",
    category: "Official Statement",
    tags: ["unicol", "public_visibility"],
    headline: "UNICOL emergency funding motion clears administrative review.",
    summary: "Observer capacity expectations improve, though enforcement remains mandate-limited.",
    involvedActors: ["UNICOL", "OCI", "HALCYON"],
    impacts: { OCI: -0.5, HALCYON: -0.2, EXEX: 0.1 },
    institutionImpacts: {
      UNICOL: { credibility: 3, operationalCapacity: 4, mandateIntegrity: 2, latestStatement: "Emergency funding improves observer continuity." },
    },
    mediaSnippet: "Funding motion trims risk premium. OCI -0.5%; UNICOL capacity improves.",
    severity: "notice",
  },
  {
    id: "autonomous-platform-order",
    category: "Market Note",
    tags: ["security_contract", "blackout", "communications"],
    headline: "Autonomous platform orders rise on blackout resilience demand.",
    summary: "OPSEC suppliers cite unmanned continuity contracts for high-latency corridors.",
    involvedActors: ["ACSB", "OPSEC", "SYNOPTIC"],
    impacts: { ACSB: 1.5, OPSEC: 0.9, SYNOPTIC: 0.4 },
    institutionImpacts: {},
    mediaSnippet: "Blackout resilience demand lifts defense-tech basket. ACSB +1.5%, OPSEC +0.9%.",
    severity: "notice",
  },
  {
    id: "public-inquiry-announced",
    category: "Official Statement",
    tags: ["legal_exposure", "public_visibility", "civilian_harm"],
    headline: "Intercolonial public inquiry announced into Corridor 12-B harm reports.",
    summary: "Legal exposure rises across extraction, security, and verification providers.",
    involvedActors: ["EXEX", "OPSEC", "SYNOPTIC", "UNICOL", "PSA"],
    impacts: { EXEX: -1.3, OPSEC: -0.4, SYNOPTIC: -0.7, OCI: 0.8, HALCYON: 0.6 },
    institutionImpacts: {
      UNICOL: { credibility: 1, mandateIntegrity: 1 },
      PSA: { credibility: 1 },
    },
    mediaSnippet: "Inquiry headline raises legal exposure. EXEX -1.3%, SYNOPTIC -0.7%, OCI +0.8%.",
    severity: "warning",
  },
  {
    id: "settlement-evacuation-priced",
    category: "Analyst Note",
    tags: ["insurance", "civilian_harm", "communications", "habitat_failure"],
    headline: "Outer colony evacuation riders repriced after settlement access review.",
    summary: "Insurance instruments and underwriters rise as evacuation assumptions widen.",
    involvedActors: ["OCI", "HALCYON", "DOMUS", "LUMEN"],
    impacts: { OCI: 1.3, HALCYON: 1.1, DOMUS: -0.5, LUMEN: 0.4 },
    institutionImpacts: {
      PSA: { publicTrust: -2 },
      UNICOL: { publicTrust: -1 },
    },
    mediaSnippet: "Evacuation repricing lifts insurance exposure. OCI +1.3%, HALCYON +1.1%.",
    severity: "warning",
  },
];

export const marketEvents = eventTemplates;
