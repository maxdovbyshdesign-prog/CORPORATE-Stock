export type CodexAtomType =
  | "entity"
  | "institution"
  | "index"
  | "concept"
  | "location"
  | "incident"
  | "document"
  | "mechanic"
  | "sector"
  | "resource";

export type StructuredCodexAtom = {
  id: string;
  type: CodexAtomType;
  title: string;
  summary: string;
  shortSummary?: string;
  publicDescription?: string;
  internalNotes?: string;
  tags: string[];
  relatedIds: string[];
  generatorHooks: string[];
  eventTags?: string[];
  marketRelevance?: string;
};

export const structuredCodexAtoms: StructuredCodexAtom[] = [
  {
    id: "muto",
    type: "concept",
    title: "MUTO",
    summary: "Autonomous and semi-autonomous systems used for continuity, perimeter control, and deniable force.",
    tags: ["security_contract", "blackout", "ACSB", "OPSEC"],
    relatedIds: ["OPSEC", "ACSB", "SYNOPTIC"],
    generatorHooks: ["contract certification", "leaked telemetry", "target classification"],
  },
  {
    id: "legal-exposure",
    type: "mechanic",
    title: "Legal Exposure",
    summary: "The distance between corporate language and liability. It drives headline risk before it drives justice.",
    tags: ["legal_exposure", "public_visibility"],
    relatedIds: ["EXEX", "OPSEC", "SYNOPTIC", "PSA"],
    generatorHooks: ["review", "inquiry", "settlement", "disclosure"],
  },
  {
    id: "public-visibility",
    type: "mechanic",
    title: "Public Visibility",
    summary: "How much of Proxima's violence becomes legible to markets, institutions, and public networks.",
    tags: ["public_visibility", "footage_leak"],
    relatedIds: ["UNICOL", "SYNOPTIC", "OCI"],
    generatorHooks: ["leak", "public reaction", "observer report"],
  },
  {
    id: "flare-window",
    type: "location",
    title: "Flare Window",
    summary: "A recurring communications and sensor disruption window around Proxima's unstable star.",
    tags: ["flare", "communications", "blackout"],
    relatedIds: ["LUMEN", "UNICOL", "PSA"],
    generatorHooks: ["relay failure", "priority bandwidth", "signal degradation"],
  },
  {
    id: "unresolved-thermal-signatures",
    type: "incident",
    title: "Unresolved Thermal Signatures",
    summary: "An official phrase for heat traces that nobody wants to name too quickly.",
    tags: ["footage_leak", "civilian_harm", "unicol"],
    relatedIds: ["UNICOL", "SYNOPTIC", "EXEX"],
    generatorHooks: ["observer report", "thermal footage", "legal review"],
  },
  {
    id: "operational-continuity",
    type: "concept",
    title: "Operational Continuity",
    summary: "The polite language of keeping extraction, security, and communications functional during violence.",
    tags: ["security_contract", "resource_supply", "communications"],
    relatedIds: ["OPSEC", "EXEX", "LUMEN"],
    generatorHooks: ["frontier contract", "continuity guarantee", "alternate line"],
  },
  {
    id: "corridor-12b",
    type: "location",
    title: "Corridor 12-B",
    summary: "A disputed movement corridor where licensing, extraction, observation, and civilian presence collide.",
    tags: ["civilian_harm", "legal_exposure", "pipeline"],
    relatedIds: ["EXEX", "UNICOL", "PSA", "OPSEC"],
    generatorHooks: ["licensing dispute", "corridor designation", "observer access"],
  },
  {
    id: "proxima-b",
    type: "location",
    title: "Proxima Centauri b",
    summary: "The frontier planet where extraction arrived faster than law.",
    tags: ["resource_supply", "flare", "public_visibility"],
    relatedIds: ["EXEX", "PXB-X", "PSA"],
    generatorHooks: ["local cycle", "frontier market", "resource concession"],
  },
  {
    id: "extraction-quota",
    type: "mechanic",
    title: "Extraction Quota",
    summary: "The administrative form of resource hunger.",
    tags: ["extraction", "resource_supply", "pipeline"],
    relatedIds: ["EXEX", "PXB-X", "OPSEC"],
    generatorHooks: ["throughput restored", "alternate line", "resource vein"],
  },
  {
    id: "pipeline",
    type: "mechanic",
    title: "Pipeline",
    summary: "A supply line, a legal claim, and a physical target.",
    tags: ["pipeline", "sabotage", "resource_supply"],
    relatedIds: ["EXEX", "PXB-X", "OPSEC", "PSA"],
    generatorHooks: ["sabotage", "repair", "throughput", "security review"],
  },
  {
    id: "px-concentrate",
    type: "resource",
    title: "Proxima Concentrate / PX Concentrate",
    summary: "A high-value Proxima material treated by markets as both future energy standard and unstable delivery risk.",
    shortSummary: "The resource at the center of the futures market.",
    publicDescription:
      "PX Concentrate is valuable only if it can be extracted, certified, transported, and adopted without collapsing the chain around it.",
    tags: ["resource_supply", "fuel_competition", "safety_review"],
    relatedIds: ["PXB-X", "EXEX", "CARBON", "ANCHOR"],
    generatorHooks: ["adoption agreement", "safety review", "delivery confidence", "throughput restoration"],
    eventTags: ["resource_supply", "transport", "fuel_competition"],
    marketRelevance: "Drives PXB-X through scarcity premium versus delivery-confidence discount.",
  },
  {
    id: "civilian-corridor",
    type: "location",
    title: "Civilian Corridor",
    summary: "A movement route whose legal and humanitarian status changes how markets price violence.",
    tags: ["civilian_harm", "unicol", "psa"],
    relatedIds: ["corridor-12b", "UNICOL", "PSA", "OCI"],
    generatorHooks: ["verified access", "corridor clearance", "observer denial"],
    eventTags: ["verified_access", "civilian_harm"],
    marketRelevance: "Verified corridors cap insurance upside and reduce ambiguity premiums.",
  },
  {
    id: "trading-halt",
    type: "mechanic",
    title: "Trading Halt",
    summary: "A temporary freeze used when current-window movement exceeds disclosure limits.",
    tags: ["legal_exposure", "public_visibility"],
    relatedIds: ["EXEX", "HALCYON", "OCI"],
    generatorHooks: ["disclosure review", "repricing event", "circuit breaker"],
    eventTags: ["legal_exposure"],
    marketRelevance: "Prevents normal actors from collapsing through repeated near-zero percentage math.",
  },
  {
    id: "degraded-stability",
    type: "mechanic",
    title: "Degraded Stability",
    summary: "A market regime where the crisis is bad but no longer accelerating.",
    tags: ["public_visibility", "insurance"],
    relatedIds: ["OCI", "HALCYON", "UNICOL"],
    generatorHooks: ["risk plateau", "stabilized crisis", "fatigue pricing"],
    eventTags: ["public_visibility", "insurance"],
    marketRelevance: "Narrows volatility and reduces repetitive downside while risk premiums remain elevated.",
  },
  {
    id: "systemic-importance",
    type: "mechanic",
    title: "Systemic Importance",
    summary: "The market's recognition that some corporations are too embedded in inhabited infrastructure to price only as scandal objects.",
    tags: ["resource_supply", "communications", "reconstruction"],
    relatedIds: ["EXEX", "LUMEN", "DOMUS", "ANCHOR"],
    generatorHooks: ["bargain buying", "strategic dependency", "contract depth"],
    eventTags: ["resource_supply", "communications", "reconstruction"],
    marketRelevance: "Supports price floors, recovery probability, and mean reversion.",
  },
  {
    id: "carbon-standard",
    type: "entity",
    title: "Carbon Standard",
    summary: "Legacy fuel and energy incumbent threatened by PX Concentrate becoming a new energy standard.",
    tags: ["fuel_competition", "safety_review", "resource_supply"],
    relatedIds: ["CARBON", "EXEX", "PXB-X", "px-concentrate"],
    generatorHooks: ["safety review", "legacy fuel rally", "energy lobbying"],
    eventTags: ["fuel_competition", "safety_review"],
    marketRelevance: "Often moves inversely to PXB-X and EXEX resource-confidence events.",
  },
  {
    id: "anchorpoint-shipping",
    type: "entity",
    title: "Anchorpoint Shipping",
    summary: "Interplanetary logistics actor controlling cargo windows, transfer capacity, and delivery confidence.",
    tags: ["transport", "logistics", "resource_supply"],
    relatedIds: ["ANCHOR", "EXEX", "PXB-X", "LUMEN"],
    generatorHooks: ["cargo window", "hazard premium", "alternate transfer route"],
    eventTags: ["transport", "logistics"],
    marketRelevance: "Can turn Proxima scarcity into deliverable value or discount it through transport failure.",
  },
];
