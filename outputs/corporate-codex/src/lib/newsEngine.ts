import {
  incidents,
  legalPhrases,
  metricPhrases,
  newsTemplates,
  places,
  type GeneratedNewsCategory,
  type NewsTemplate,
} from "../data/newsTemplates";
import {
  getInstitution,
  getMarketInstrument,
  institutions,
  marketInstruments,
  type EntityId,
  type InstitutionId,
  type MarketInstrumentId,
} from "../data/entities";
import type { EventCategory, EventTag, InstitutionImpact, MarketEvent } from "../data/events";
import { loreAtoms, type LoreAtom } from "./codexExtractor";
import { activeStoryline } from "./marketModel";
import { createDirectedMarketEvent, type EventDirectorContext } from "../sim/director";

export type InstitutionMetrics = InstitutionImpact;

export type GeneratedNewsItem = {
  id: string;
  templateId: string;
  timestamp: number;
  category: GeneratedNewsCategory;
  headline: string;
  summary: string;
  source: string;
  involvedActors: string[];
  tags: string[];
  marketImpacts: Record<string, number>;
  institutionImpacts?: Record<string, Partial<InstitutionMetrics>>;
  publicVisibilityDelta?: number;
  legalExposureDelta?: number;
  severity: number;
  publicReaction?: string;
};

export type NewsIntensity = "low" | "normal" | "high";

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

const isMarketId = (id: string): id is MarketInstrumentId => marketIds.includes(id as MarketInstrumentId);
const isInstitutionId = (id: string): id is InstitutionId => institutionIds.includes(id as InstitutionId);

const choice = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

let generationStep = 0;
const templateCooldowns = new Map<string, number>();
const actorCooldowns = new Map<string, number>();

const cleanPublicReactions = [
  "\"unresolved thermal signatures\" is the most cursed phrase I have read this year.",
  "EXEX up after denying involvement. Completely normal civilization.",
  "UNICOL brought traffic cones to a resource war.",
  "OPSEC just monetized the gap between law and violence.",
  "Attachments unavailable due to legal review. The shelter line is gone.",
  "The market has stabilized around the horror.",
  "Every emergency channel is a premium service tier now.",
  "They called it a routing error like people are parcels.",
  "Carbon Standard discovered safety concerns right when Proxima fuel became competitive. Amazing timing.",
  "Shipping delay, legal review, observer access denied. Same sentence, different quarter.",
  "Risk remained priced but unresolved, which is apparently the calm version.",
  "The tape narrowed. Nobody on the ground did.",
  "A corridor can be open, conditional, and unusable in the same paragraph.",
  "Every statement says temporary like that helps the people waiting.",
  "Verification arrived before protection again.",
  "Desks held prior assumptions because the crisis learned to repeat itself.",
  "The market no longer prices surprise, only duration.",
  "Counsel has become a weather system.",
  "They did not solve the route. They renamed the delay.",
  "Observer access is not enforcement, but it is no longer nothing.",
];

const sanitizePublicReaction = (value: string) => {
  const cleaned = value
    .replace(/^#+\s*/g, "")
    .replace(/^\d+\.\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /^[A-Z0-9 /-]+$/.test(cleaned) || /excerpt|section|placeholder|lore bible/i.test(cleaned)) {
    return choice(cleanPublicReactions);
  }

  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
};

const pickTemplate = (intensity: NewsIntensity) => {
  generationStep += 1;
  for (const [id, until] of templateCooldowns) {
    if (until <= generationStep) templateCooldowns.delete(id);
  }
  for (const [id, until] of actorCooldowns) {
    if (until <= generationStep) actorCooldowns.delete(id);
  }

  const base =
    intensity === "high"
      ? newsTemplates.filter((template) => template.severityRange[1] >= 70)
      : intensity === "low"
        ? newsTemplates.filter((template) => template.severityRange[0] <= 40)
        : newsTemplates;
  const available = base.filter(
    (template) =>
      !templateCooldowns.has(template.id) &&
      template.actorPool.every((actor) => !actorCooldowns.has(actor)),
  );
  const template = choice(available.length ? available : base);
  templateCooldowns.set(template.id, generationStep + (template.cooldown ?? (template.severityRange[1] >= 75 ? 4 : 2)));

  return template;
};

const pickLoreAtom = (kinds: LoreAtom["kind"][], tags: string[], fallback: string) => {
  const tagged = loreAtoms.filter(
    (atom) => kinds.includes(atom.kind) && atom.tags.some((tag) => tags.includes(tag)),
  );
  const broad = loreAtoms.filter((atom) => kinds.includes(atom.kind));
  return (tagged.length ? choice(tagged) : broad.length ? choice(broad) : undefined)?.text ?? fallback;
};

const pickShortAtom = (kinds: LoreAtom["kind"][], tags: string[], fallback: string, maxLength = 72) => {
  const atoms = loreAtoms.filter(
    (atom) =>
      kinds.includes(atom.kind) &&
      atom.text.length <= maxLength &&
      !/[.!?]$/.test(atom.text) &&
      atom.tags.some((tag) => tags.includes(tag)),
  );
  return atoms.length ? choice(atoms).text : fallback;
};

const pickPlace = () => choice(places);

const labelFor = (id: EntityId) => {
  if (isMarketId(id)) return getMarketInstrument(id).id;
  return getInstitution(id).id;
};

const fullNameFor = (id: EntityId) => {
  if (isMarketId(id)) return getMarketInstrument(id).fullName;
  return getInstitution(id).fullName;
};

const normalizeImpact = (value: number, intensity: NewsIntensity) => {
  const intensityFactor = intensity === "high" ? 1.35 : intensity === "low" ? 0.68 : 1;
  const jitter = 0.86 + Math.random() * 0.28;
  const next = value * intensityFactor * jitter;
  return Number(next.toFixed(1));
};

const severityFor = (template: NewsTemplate, intensity: NewsIntensity) => {
  const [min, max] = template.severityRange;
  const base = min + Math.random() * (max - min);
  const adjusted = intensity === "high" ? base + 10 : intensity === "low" ? base - 8 : base;
  return Math.round(Math.min(100, Math.max(1, adjusted)));
};

const eventSeverityFor = (severity: number): MarketEvent["severity"] => {
  if (severity >= 75) return "material";
  if (severity >= 45) return "warning";
  return "notice";
};

const phaseFor = (tags: EventTag[], category: EventCategory) => {
  if (tags.includes("reconstruction")) return "Reconstruction / Countermeasure";
  if (tags.includes("data_suppression") || tags.includes("footage_leak")) return "Evidence Suppression / Market Volatility";
  if (tags.includes("legal_exposure") || category === "PSA Directive") return "Licensing Objection / Legal Review";
  if (tags.includes("civilian_harm")) return "UNICOL Report / Public Visibility";
  if (tags.includes("resource_supply") || tags.includes("pipeline")) return "Throughput Dispute";
  return activeStoryline.phase;
};

const compactImpacts = (impacts: Record<string, number>) =>
  Object.entries(impacts)
    .filter(([, value]) => Math.abs(value) >= 0.1)
    .slice(0, 4)
    .map(([id, value]) => `${isMarketId(id) ? getMarketInstrument(id).symbol : id} ${value >= 0 ? "+" : ""}${value.toFixed(1)}%`)
    .join(", ");

const replaceSlots = (template: string, slots: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? "");

const pickIncident = (tags: string[]) => {
  if (tags.includes("habitat_failure")) {
    return choice(["water-loop service degradation", "oxygen access interruption", "civilian infrastructure damage"]);
  }

  if (tags.includes("flare") || tags.includes("communications")) {
    return choice(["relay-window failure", "flare blackout window", "priority bandwidth disruption"]);
  }

  if (tags.includes("footage_leak") || tags.includes("data_suppression")) {
    return choice(["thermal footage leak", "sensor access dispute", "unresolved thermal signatures"]);
  }

  if (tags.includes("resource_supply") || tags.includes("pipeline") || tags.includes("extraction")) {
    return choice(["resource transfer interruption", "pipeline disruption", "corridor throughput failure"]);
  }

  if (tags.includes("insurance")) {
    return choice(["fatality recognition delay", "evacuation rider repricing", "incomplete telemetry review"]);
  }

  return choice(incidents);
};

const pickResource = (tags: string[]) => {
  if (tags.includes("habitat_failure")) return choice(["water-loop capacity", "oxygen access"]);
  if (tags.includes("flare") || tags.includes("communications")) return "priority bandwidth";
  if (tags.includes("footage_leak") || tags.includes("data_suppression")) return "orbital stills";
  if (tags.includes("security_contract")) return "MUTO-compatible components";
  if (tags.includes("insurance")) return "evacuation riders";
  return choice(["Proxima concentrate", "corridor throughput", "resource continuity"]);
};

export const generateNewsItem = (intensity: NewsIntensity = "normal"): GeneratedNewsItem => {
  const template = pickTemplate(intensity);
  const primary = choice(template.actorPool);
  const related = [...template.relatedActorPool];

  if (isMarketId(primary)) {
    for (const relation of getMarketInstrument(primary).relationshipTags) {
      if (Math.random() > 0.55) related.push(relation);
    }
  }

  if (isInstitutionId(primary)) {
    for (const relation of getInstitution(primary).relationshipTags) {
      if (Math.random() > 0.55) related.push(relation);
    }
  }

  const involvedActors = Array.from(new Set([primary, ...related])).filter(
    (id): id is EntityId => isMarketId(id) || isInstitutionId(id),
  );
  const impactedIndex = choice(["OCI", "PXB-X", "ACSB"] as MarketInstrumentId[]);
  const marketImpacts = Object.fromEntries(
    Object.entries(template.marketImpacts).map(([id, value]) => [id, normalizeImpact(value ?? 0, intensity)]),
  ) as Record<string, number>;

  const severity = severityFor(template, intensity);
  const tags = Array.from(new Set(template.tags));
  const phrase = pickShortAtom(["phrase", "term", "report_line"], tags, choice(incidents));
  const quote = pickLoreAtom(["quote"], tags, "The future is managed.");
  const publicReaction = sanitizePublicReaction(choice(cleanPublicReactions));

  const slots = {
    actor: labelFor(primary),
    actorName: fullNameFor(primary),
    institution: labelFor(choice(institutions).id),
    index: getMarketInstrument(impactedIndex).fullName,
    place: pickPlace(),
    incident: pickIncident(tags),
    resource: pickResource(tags),
    corridor: pickPlace(),
    quote,
    phrase,
    metric: choice(metricPhrases),
    publicReaction,
    legalPhrase: choice(legalPhrases),
  };

  const timestamp = Date.now();
  actorCooldowns.set(String(primary), generationStep + (severity >= 70 ? 2 : 1));
  return {
    id: `proc-${template.id}-${timestamp}-${Math.floor(Math.random() * 1000)}`,
    templateId: template.id,
    timestamp,
    category: template.category,
    headline: replaceSlots(template.headline, slots),
    summary: replaceSlots(template.summary, slots),
    source: template.source,
    involvedActors,
    tags,
    marketImpacts,
    institutionImpacts: template.institutionImpacts as Record<string, Partial<InstitutionMetrics>> | undefined,
    publicVisibilityDelta: template.publicVisibilityDelta,
    legalExposureDelta: template.legalExposureDelta,
    severity,
    publicReaction: severity >= 68 ? sanitizePublicReaction(publicReaction) : undefined,
  };
};

export const generatedItemToMarketEvent = (item: GeneratedNewsItem): MarketEvent => ({
  id: item.id,
  templateId: item.templateId,
  category: categoryMap[item.category],
  tags: item.tags as EventTag[],
  headline: item.headline,
  summary: item.summary,
  involvedActors: item.involvedActors.filter((id): id is MarketInstrumentId | InstitutionId => isMarketId(id) || isInstitutionId(id)),
  impacts: item.marketImpacts as Partial<Record<MarketInstrumentId, number>>,
  institutionImpacts: item.institutionImpacts as Partial<Record<InstitutionId, InstitutionImpact>> | undefined ?? {},
  mediaSnippet: `${item.summary}${compactImpacts(item.marketImpacts) ? ` ${compactImpacts(item.marketImpacts)}.` : ""}`,
  publicReaction: item.publicReaction ? sanitizePublicReaction(item.publicReaction) : undefined,
  severity: eventSeverityFor(item.severity),
  source: item.source,
  timestamp: item.timestamp,
  generated: true,
  publicVisibilityDelta: item.publicVisibilityDelta,
  legalExposureDelta: item.legalExposureDelta,
  storylineId: activeStoryline.id,
  phase: phaseFor(item.tags as EventTag[], categoryMap[item.category]),
});

export const generateMarketEvent = (intensity: NewsIntensity = "normal") =>
  generatedItemToMarketEvent(generateNewsItem(intensity));

export const USE_EVENT_DIRECTOR = true;

export const generateDirectedMarketEvent = (context: Omit<EventDirectorContext, "intensity">, intensity: NewsIntensity = "normal") => {
  if (!USE_EVENT_DIRECTOR) return generateMarketEvent(intensity);

  return createDirectedMarketEvent({ ...context, intensity }) ?? generateMarketEvent(intensity);
};

export const generatePublicReactionEvent = (parent: MarketEvent, recentEvents: MarketEvent[] = []): MarketEvent | null => {
  if (parent.severity !== "material" || !parent.publicReaction) return null;
  const family = parent.publicReactionFamily;
  if (!family) return null;
  const recentFamilyCount = family
    ? recentEvents.slice(0, 12).filter((event) => event.publicReactionFamily === family).length
    : 0;
  const recentReactionEvents = recentEvents.slice(0, 8).filter((event) => event.category === "Public Reaction").length;
  const exactPhraseCount = recentEvents
    .slice(0, 18)
    .filter((event) => event.category === "Public Reaction" && event.summary === parent.publicReaction).length;

  const crossesSaturationStep = recentFamilyCount === 2 || recentFamilyCount === 5;
  if (!crossesSaturationStep || recentReactionEvents > 0 || exactPhraseCount > 0) return null;

  const timestamp = Date.now() + 1;
  return {
    id: `proc-reaction-${parent.id}-${timestamp}`,
    category: "Public Reaction",
    tags: ["public_visibility", ...(parent.tags ?? [])].slice(0, 5) as EventTag[],
    headline: "Public networks repeat settlement reaction.",
    summary: parent.publicReaction,
    involvedActors: parent.involvedActors,
    impacts: {},
    institutionImpacts: {
      UNICOL: { publicTrust: -1 },
      PSA: { publicTrust: -1 },
    },
    mediaSnippet: parent.publicReaction,
    publicReaction: parent.publicReaction,
    severity: "notice",
    source: "PUBLIC NETWORK",
    timestamp,
    generated: true,
    publicReactionFamily: family,
    semanticPattern: family ? `PUBLIC:${family}` : "PUBLIC:reaction",
    noveltyScore: family ? Math.max(0.35, 0.9 - recentFamilyCount * 0.18) : 0.8,
    directorNotes: family
      ? [`Public reaction family ${family} allowed; recent family count ${recentFamilyCount}.`]
      : undefined,
  };
};
