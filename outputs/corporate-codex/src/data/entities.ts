export type MarketInstrumentId =
  | "EXEX"
  | "OPSEC"
  | "SYNOPTIC"
  | "LUMEN"
  | "HALCYON"
  | "DOMUS"
  | "CARBON"
  | "ANCHOR"
  | "PXB-X"
  | "OCI"
  | "ACSB";

export type InstitutionId = "UNICOL" | "PSA";
export type EntityId = MarketInstrumentId | InstitutionId;

export type MarketInstrument = {
  id: MarketInstrumentId;
  symbol: string;
  accentColor: string;
  category: "actor" | "index";
  fullName: string;
  type: string;
  profile: string;
  exposure: string;
  basePrice: number;
  volatility: number;
  trendBias: number;
  initialTrend: number;
  publicVisibility: "LOW" | "MEDIUM" | "HIGH";
  legalExposure: "LOW" | "MANAGED" | "ELEVATED" | "UNRESOLVED";
  signalQuality: "STABLE" | "DEGRADED" | "INTERRUPTED";
  riskTags: string[];
  relationshipTags: EntityId[];
  headlines: string[];
  documentRefs: Array<{
    documentId: string;
    section: string;
    label: string;
  }>;
};

export type Institution = {
  id: InstitutionId;
  fullName: string;
  type: string;
  currentStatus: string;
  credibility: number;
  operationalCapacity: number;
  enforcementCapacity: number;
  mandateIntegrity: number;
  publicTrust: number;
  signalAccess: number;
  latestStatement: string;
  recentDirective: string;
  profile: string;
  relationshipTags: EntityId[];
  documentRefs: Array<{
    documentId: string;
    section: string;
    label: string;
  }>;
};

export const marketInstruments: MarketInstrument[] = [
  {
    id: "EXEX",
    symbol: "XX",
    accentColor: "#d98a3b",
    category: "actor",
    fullName: "Extraterrestrial Excavation",
    type: "Off-world mining / resource infrastructure",
    profile:
      "The original off-world extraction monopoly. EXEX still presents itself as patient capital and critical infrastructure, while every road, relay, and corridor bends toward its concessions.",
    exposure:
      "Benefits from functioning pipelines, favorable corridor licenses, and silence around contractor activity.",
    basePrice: 812.4,
    volatility: 0.45,
    trendBias: 0.08,
    initialTrend: 0.34,
    publicVisibility: "HIGH",
    legalExposure: "MANAGED",
    signalQuality: "STABLE",
    riskTags: ["Legacy monopoly", "Corridor dependency", "Contractor opacity"],
    relationshipTags: ["OPSEC", "SYNOPTIC", "LUMEN", "UNICOL", "PSA", "PXB-X", "CARBON", "ANCHOR"],
    headlines: [
      "Company denies operational role in Corridor 12-B incident.",
      "Extraction continuity plan remains within licensed operating scope.",
      "Shareholders briefed on commercial confidentiality protections.",
    ],
    documentRefs: [
      { documentId: "entities", section: "EXEX", label: "Entity Source" },
      { documentId: "media-fragments", section: "7. EXEX Press Briefing Excerpt", label: "Press Briefing" },
      { documentId: "lore-bible", section: "EXEX — Extraterrestrial Excavation", label: "Lore Bible" },
    ],
  },
  {
    id: "OPSEC",
    symbol: "OPS",
    accentColor: "#5f8df0",
    category: "actor",
    fullName: "Operational Security",
    type: "Private military / security contractor",
    profile:
      "A security firm built from former army structures, veterans, and new fighters trained around the newest autonomous platforms. It sells calm language to people who can afford violence.",
    exposure:
      "Rises with uncertainty, sabotage, destroyed routes, and board-level anxiety about continuity.",
    basePrice: 294.2,
    volatility: 1.25,
    trendBias: 0.14,
    initialTrend: 0.71,
    publicVisibility: "MEDIUM",
    legalExposure: "MANAGED",
    signalQuality: "DEGRADED",
    riskTags: ["Escalation upside", "Contractor liability", "Autonomy exposure"],
    relationshipTags: ["EXEX", "ACSB", "SYNOPTIC", "UNICOL", "ANCHOR"],
    headlines: [
      "Security demand rises after renewed Proxima infrastructure attacks.",
      "New frontier continuity contracts announced for unnamed clients.",
      "Founder says peace is an unreliable operating assumption.",
    ],
    documentRefs: [
      { documentId: "entities", section: "OPSEC", label: "Entity Source" },
      { documentId: "media-fragments", section: "10. OPSEC Talk Excerpt", label: "Founder Talk" },
      { documentId: "lore-bible", section: "OPSEC — Operational Security", label: "Lore Bible" },
    ],
  },
  {
    id: "SYNOPTIC",
    symbol: "SYN",
    accentColor: "#55b987",
    category: "actor",
    fullName: "Synoptic Orbital",
    type: "Orbital imaging / sensor intelligence",
    profile:
      "Controls orbital feeds, thermal maps, surveillance products, and independent verification packages. Synoptic owns the eyes above Proxima.",
    exposure:
      "Rises when verification demand spikes after footage leaks; falls when clients accuse it of data suppression.",
    basePrice: 188.6,
    volatility: 0.92,
    trendBias: 0.09,
    initialTrend: 0.46,
    publicVisibility: "MEDIUM",
    legalExposure: "MANAGED",
    signalQuality: "STABLE",
    riskTags: ["Data suppression", "Verification demand", "Orbital monopoly"],
    relationshipTags: ["EXEX", "OPSEC", "UNICOL", "LUMEN", "ANCHOR"],
    headlines: [
      "Verification demand rises after disputed corridor footage leak.",
      "Synoptic says all imagery releases remain contract-compliant.",
      "Nothing happens off-record, company says in investor deck.",
    ],
    documentRefs: [
      { documentId: "entities", section: "SYNOPTIC ORBITAL", label: "Placeholder Source" },
      { documentId: "lore-bible", section: "SYNOPTIC ORBITAL", label: "Lore Bible" },
      { documentId: "media-fragments", section: "8. EXEX Questioning Excerpt", label: "Questioning Excerpt" },
    ],
  },
  {
    id: "LUMEN",
    symbol: "LMN",
    accentColor: "#62c5d1",
    category: "actor",
    fullName: "Lumen Relay",
    type: "Communications / relay infrastructure",
    profile:
      "Controls priority communications during flare interference and blackout windows. Even communication during disaster is a billable tier.",
    exposure:
      "Rises during flare windows and priority bandwidth spikes; falls when relay failures strand observers or civilians.",
    basePrice: 96.4,
    volatility: 0.86,
    trendBias: 0.06,
    initialTrend: 0.21,
    publicVisibility: "MEDIUM",
    legalExposure: "LOW",
    signalQuality: "DEGRADED",
    riskTags: ["Relay dependency", "Priority pricing", "Blackout liability"],
    relationshipTags: ["EXEX", "PSA", "UNICOL", "SYNOPTIC", "OCI", "ANCHOR"],
    headlines: [
      "Priority relay pricing widens during moderate flare window.",
      "Lumen denies service-tier discrimination in civilian corridors.",
      "Bandwidth reservations rise before expected Proxima blackout.",
    ],
    documentRefs: [
      { documentId: "entities", section: "LUMEN RELAY", label: "Placeholder Source" },
      { documentId: "lore-bible", section: "LUMEN RELAY / NEARLIGHT COMMUNICATIONS", label: "Lore Bible" },
      { documentId: "media-fragments", section: "2. Intro Terminal Beat", label: "Terminal Beat" },
    ],
  },
  {
    id: "HALCYON",
    symbol: "HCY",
    accentColor: "#b38af3",
    category: "actor",
    fullName: "Halcyon Risk",
    type: "Insurance / underwriting",
    profile:
      "Decides which settlements, deaths, infrastructure losses, and evacuations become financially recognized. Fatality recognition delayed pending signal confirmation.",
    exposure:
      "Rises when risk increases and after UNICOL failures; turns volatile when public scandals threaten policy exclusions.",
    basePrice: 132.8,
    volatility: 1.08,
    trendBias: 0.1,
    initialTrend: 0.52,
    publicVisibility: "LOW",
    legalExposure: "ELEVATED",
    signalQuality: "STABLE",
    riskTags: ["Recognition delay", "Policy exclusions", "Evacuation repricing"],
    relationshipTags: ["OCI", "UNICOL", "PSA", "DOMUS"],
    headlines: [
      "Underwriting spreads widen after unresolved personnel ledger update.",
      "Fatality recognition delayed pending signal confirmation.",
      "Halcyon rallies as outer colony risk assumptions reset.",
    ],
    documentRefs: [
      { documentId: "entities", section: "HALCYON RISK", label: "Placeholder Source" },
      { documentId: "lore-bible", section: "HALCYON RISK / COLONIAL RISK EXCHANGE", label: "Lore Bible" },
      { documentId: "media-fragments", section: "13. Financial Analysis Excerpt", label: "Market Analysis" },
    ],
  },
  {
    id: "DOMUS",
    symbol: "DOM",
    accentColor: "#d4b65f",
    category: "actor",
    fullName: "Domus Habitat Systems",
    type: "Civilian habitat / oxygen / water infrastructure",
    profile:
      "Builds and controls domes, oxygen access, housing, and water loops. The business model is simple: life as subscription.",
    exposure:
      "Falls when civilian infrastructure is damaged; rises on reconstruction contracts and emergency habitat procurement.",
    basePrice: 68.2,
    volatility: 1.22,
    trendBias: 0.02,
    initialTrend: -0.18,
    publicVisibility: "HIGH",
    legalExposure: "ELEVATED",
    signalQuality: "DEGRADED",
    riskTags: ["Habitat failure", "Subscription access", "Reconstruction upside"],
    relationshipTags: ["PSA", "UNICOL", "HALCYON", "OCI", "ANCHOR"],
    headlines: [
      "Emergency habitat contracts offset civilian infrastructure losses.",
      "Water-loop access dispute returns to PSA licensing docket.",
      "Domus denies oxygen throttling during settlement outage.",
    ],
    documentRefs: [
      { documentId: "entities", section: "DOMUS HABITAT SYSTEMS", label: "Placeholder Source" },
      { documentId: "lore-bible", section: "DOMUS HABITAT SYSTEMS", label: "Lore Bible" },
      { documentId: "media-fragments", section: "16. PSA Emergency Directive", label: "PSA Directive" },
    ],
  },
  {
    id: "CARBON",
    symbol: "CSTD",
    accentColor: "#9b9a75",
    category: "actor",
    fullName: "Carbon Standard",
    type: "Legacy fuel / energy incumbent",
    profile:
      "The old energy bloc: oil legacy, uranium, synthetic fuels, fusion feedstock, ship fuel, and colonial generator contracts. Carbon Standard reads Proxima concentrate as a possible extinction event.",
    exposure:
      "Rises when Proxima throughput looks unsafe or unreliable; falls when EXEX proves delivery and adoption confidence.",
    basePrice: 244.6,
    volatility: 0.74,
    trendBias: 0.03,
    initialTrend: 0.16,
    publicVisibility: "MEDIUM",
    legalExposure: "MANAGED",
    signalQuality: "STABLE",
    riskTags: ["Legacy fuel moat", "Energy lobbying", "Proxima substitution threat"],
    relationshipTags: ["EXEX", "PXB-X", "ANCHOR", "PSA"],
    headlines: [
      "Carbon Standard warns against premature dependence on Proxima concentrate.",
      "Legacy fuel bloc rallies after Proxima throughput guidance narrows.",
      "Independent safety review questions new resource chain assumptions.",
    ],
    documentRefs: [
      { documentId: "entities", section: "CARBON STANDARD", label: "Entity Source" },
      { documentId: "lore-bible", section: "CARBON STANDARD", label: "Lore Bible" },
      { documentId: "media-fragments", section: "13. Financial Analysis Excerpt", label: "Market Analysis" },
    ],
  },
  {
    id: "ANCHOR",
    symbol: "APS",
    accentColor: "#c9a0d6",
    category: "actor",
    fullName: "Anchorpoint Shipping",
    type: "Interplanetary logistics / transfer capacity",
    profile:
      "Controls cargo windows, transfer slots, orbital freight, launch infrastructure, and the banal miracle of making valuable material arrive somewhere useful.",
    exposure:
      "Rises on transport demand and emergency freight contracts; falls when relay disruption, hazard premiums, or cargo-window failure make Proxima delivery unreliable.",
    basePrice: 118.4,
    volatility: 0.9,
    trendBias: 0.07,
    initialTrend: 0.28,
    publicVisibility: "LOW",
    legalExposure: "LOW",
    signalQuality: "STABLE",
    riskTags: ["Cargo window reliability", "Hazard premiums", "Orbital terminal congestion"],
    relationshipTags: ["EXEX", "PXB-X", "LUMEN", "CARBON", "HALCYON"],
    headlines: [
      "Anchorpoint raises hazard premiums on Proxima concentrate shipments.",
      "Alternate transfer route clears after relay-window review.",
      "Transport desks question Proxima corridor reliability.",
    ],
    documentRefs: [
      { documentId: "entities", section: "ANCHORPOINT SHIPPING", label: "Entity Source" },
      { documentId: "lore-bible", section: "ANCHORPOINT SHIPPING", label: "Lore Bible" },
      { documentId: "media-fragments", section: "13. Financial Analysis Excerpt", label: "Market Analysis" },
    ],
  },
  {
    id: "PXB-X",
    symbol: "PXB",
    accentColor: "#df6f61",
    category: "index",
    fullName: "Proxima Resource Futures",
    type: "Commodity / resource index",
    profile:
      "A futures index tracking the valuable Proxima concentrate. The index has no conscience, only supply pressure, outage risk, and the comforting abstraction of tonnage.",
    exposure:
      "Rises when extraction succeeds, gaps violently when infrastructure is damaged, and turns every incident into a pricing question.",
    basePrice: 143.5,
    volatility: 1.42,
    trendBias: 0.05,
    initialTrend: 0.51,
    publicVisibility: "HIGH",
    legalExposure: "LOW",
    signalQuality: "STABLE",
    riskTags: ["Supply disruption", "Corridor throughput", "Concentrate scarcity"],
    relationshipTags: ["EXEX", "OCI", "LUMEN", "CARBON", "ANCHOR"],
    headlines: [
      "Proxima concentrate futures extend gains after supply disruption.",
      "Forward curve steepens on corridor uncertainty.",
      "Analysts cite resilient demand despite humanitarian access concerns.",
    ],
    documentRefs: [
      { documentId: "entities", section: "PXB-X", label: "Entity Source" },
      { documentId: "media-fragments", section: "13. Financial Analysis Excerpt", label: "Market Analysis" },
      { documentId: "lore-bible", section: "PXB-X — Proxima Resource Futures", label: "Lore Bible" },
    ],
  },
  {
    id: "OCI",
    symbol: "OCI",
    accentColor: "#8bb8c7",
    category: "index",
    fullName: "Outer Colony Insurance Index",
    type: "Insurance / risk index",
    profile:
      "A composite risk index for evacuation, personnel disappearance, destroyed infrastructure, and policy exclusions written in language no grieving family will ever successfully contest.",
    exposure:
      "Moves higher as conditions worsen. The index is a clean line chart drawn through a messy evacuation ledger.",
    basePrice: 221.7,
    volatility: 0.98,
    trendBias: 0.12,
    initialTrend: 0.47,
    publicVisibility: "MEDIUM",
    legalExposure: "MANAGED",
    signalQuality: "DEGRADED",
    riskTags: ["Premium shock", "Evacuation liability", "Exclusion creep"],
    relationshipTags: ["UNICOL", "PSA", "EXEX", "HALCYON", "DOMUS", "ANCHOR"],
    headlines: [
      "Outer colony insurance premiums reach new cycle high.",
      "Underwriters expand exclusions after relay-window failures.",
      "Evacuation riders repriced following corridor access review.",
    ],
    documentRefs: [
      { documentId: "entities", section: "OCI", label: "Entity Source" },
      { documentId: "media-fragments", section: "13. Financial Analysis Excerpt", label: "Market Analysis" },
      { documentId: "lore-bible", section: "OCI — Outer Colony Insurance Index", label: "Lore Bible" },
    ],
  },
  {
    id: "ACSB",
    symbol: "ACS",
    accentColor: "#d477a5",
    category: "index",
    fullName: "Autonomous Combat Systems Basket",
    type: "Defense-tech index",
    profile:
      "An index of drone makers, autonomous platforms, battlefield compute vendors, and MUTO-compatible suppliers whose growth reports read like weather warnings.",
    exposure:
      "Benefits from blackout resilience demand, force protection contracts, and any phrase involving unmanned perimeter assurance.",
    basePrice: 176.9,
    volatility: 0.82,
    trendBias: 0.11,
    initialTrend: 0.38,
    publicVisibility: "LOW",
    legalExposure: "MANAGED",
    signalQuality: "STABLE",
    riskTags: ["Autonomy risk", "Battlefield demand", "Procurement opacity"],
    relationshipTags: ["OPSEC", "SYNOPTIC", "ANCHOR"],
    headlines: [
      "Autonomous combat systems basket rises on blackout resilience demand.",
      "Suppliers rally after OPSEC platform modernization briefing.",
      "MUTO-compatible component orders exceed prior guidance.",
    ],
    documentRefs: [
      { documentId: "entities", section: "ACSB", label: "Entity Source" },
      { documentId: "media-fragments", section: "12. OPSEC MUTO Excerpt", label: "MUTO Excerpt" },
      { documentId: "lore-bible", section: "ACSB — Autonomous Combat Systems Basket", label: "Lore Bible" },
    ],
  },
];

export const institutions: Institution[] = [
  {
    id: "UNICOL",
    fullName: "United Colonies",
    type: "Peacekeeping / political institution",
    currentStatus: "Mandate-Limited",
    credibility: 34,
    operationalCapacity: 22,
    enforcementCapacity: 11,
    mandateIntegrity: 41,
    publicTrust: 29,
    signalAccess: 46,
    latestStatement: "Mission calls for restraint after loss of contact with Post 12-B.",
    recentDirective: "Observer mission requests access confirmation before humanitarian entry.",
    profile:
      "A fragile intercolonial institution with obsolete robots, underfunded observers, and an extraordinary capacity to report catastrophe after it has become administratively complete.",
    relationshipTags: ["PSA", "EXEX", "OPSEC", "OCI", "HALCYON"],
    documentRefs: [
      { documentId: "entities", section: "UNICOL", label: "Entity Source" },
      { documentId: "media-fragments", section: "3. UNICOL Incident Report Excerpt", label: "Incident Report" },
      { documentId: "lore-bible", section: "UNICOL — United Colonies", label: "Lore Bible" },
    ],
  },
  {
    id: "PSA",
    fullName: "Proxima Settlement Authority",
    type: "Local administration / weak political authority",
    currentStatus: "Provisional",
    credibility: 21,
    operationalCapacity: 18,
    enforcementCapacity: 8,
    mandateIntegrity: 36,
    publicTrust: 27,
    signalAccess: 39,
    latestStatement: "Emergency directive issued for Corridor 12-B. Enforcement unavailable.",
    recentDirective: "Temporary suspension requested for armed commercial activity inside disputed civilian corridor.",
    profile:
      "The semi-legitimate administrative shell on Proxima Centauri b. It issues directives, corridor notices, licensing objections, and sovereignty claims that expire on contact with capital.",
    relationshipTags: ["UNICOL", "EXEX", "PXB-X", "DOMUS", "LUMEN"],
    documentRefs: [
      { documentId: "entities", section: "PSA", label: "Entity Source" },
      { documentId: "media-fragments", section: "16. PSA Emergency Directive", label: "Emergency Directive" },
      { documentId: "lore-bible", section: "PSA — Proxima Settlement Authority", label: "Lore Bible" },
    ],
  },
];

export const getMarketInstrument = (id: MarketInstrumentId) =>
  marketInstruments.find((instrument) => instrument.id === id) ?? marketInstruments[0];

export const getInstitution = (id: InstitutionId) =>
  institutions.find((institution) => institution.id === id) ?? institutions[0];
