import { getInstitution, getMarketInstrument, institutions, marketInstruments, type EntityId, type InstitutionId, type MarketInstrumentId } from "../data/entities";
import type { EventTag, InstitutionImpact, MarketEvent } from "../data/events";
import { socialAccounts, type SocialAccount, type SocialPersonaType } from "../data/socialAccounts";
import { socialTemplates, type SocialSentiment, type SocialTemplate, type SocialVisibility } from "../data/socialTemplates";
import type { InstitutionState, MarketState } from "../App";

export type SocialPost = {
  id: string;
  timestamp: string;
  simulatedTime: string;
  accountId: string;
  handle: string;
  displayName: string;
  role: string;
  origin?: string;
  text: string;
  tags: string[];
  relatedEventId?: string;
  relatedActors: string[];
  sentiment: SocialSentiment;
  intensity: number;
  personaType: SocialPersonaType;
  visibility?: SocialVisibility;
  templateId?: string;
  family?: string;
  selectionScore?: number;
  selectionNotes?: string[];
};

export type PublicPulseResult = {
  posts: SocialPost[];
  institutionImpacts: Partial<Record<InstitutionId, InstitutionImpact>>;
};

export type PublicPulseSummary = {
  dominantSentiment: string;
  mostActiveTopics: string[];
  samplePosts: SocialPost[];
  recentPostCount: number;
  topPersonaTypes: string[];
  topSentimentTags: string[];
  saturationContributions: string[];
  selectionNotes: string[];
};

const marketIds = marketInstruments.map((instrument) => instrument.id);
const institutionIds = institutions.map((institution) => institution.id);
const isMarketId = (id: string): id is MarketInstrumentId => marketIds.includes(id as MarketInstrumentId);
const isInstitutionId = (id: string): id is InstitutionId => institutionIds.includes(id as InstitutionId);
const choice = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const personaLabels: Record<SocialPersonaType, string> = {
  settler: "Settlement",
  investor: "Investor",
  contractor: "Contractor",
  analyst: "Analyst",
  institutional: "Institution",
  psa_local: "Local PSA",
  exex_holder: "Investor",
  opsec_supporter: "Contractor",
  anti_corporate: "Anti-corp",
  carbon_aligned: "Investor",
  logistics: "Logistics",
  industrial_worker: "Industrial",
  bot_or_promoted: "Promoted",
};

export const publicPulseFilterLabels = ["All", "Settlement", "Investor", "Contractor", "Institution", "Local PSA", "Anti-corp"] as const;
export type PublicPulseFilter = (typeof publicPulseFilterLabels)[number];

export const filterPostByPulse = (post: SocialPost, filter: PublicPulseFilter) => {
  if (filter === "All") return true;
  return personaLabels[post.personaType] === filter;
};

const actorName = (id: string) => {
  if (isMarketId(id)) return getMarketInstrument(id).fullName;
  if (isInstitutionId(id)) return getInstitution(id).fullName;
  return id;
};

const compactActor = (id: string) => {
  if (isMarketId(id)) return getMarketInstrument(id).id;
  if (isInstitutionId(id)) return getInstitution(id).id;
  return id;
};

const eventActors = (event: MarketEvent): EntityId[] =>
  event.involvedActors.filter((id): id is EntityId => isMarketId(id) || isInstitutionId(id));

const publicReactionFamilyAliases: Record<string, string[]> = {
  "denial-fatigue": ["exex-denial"],
  evidence: ["synoptic-evidence", "unicol-verified-access"],
  "contractor-liability": ["opsec-muto"],
  "insurance-cruelty": ["insurance-cruelty"],
  "subscription-life": ["domus-tenant"],
  pricing: ["lumen-pricing"],
};

const semanticFamilyAliases: Record<string, string[]> = {
  EXEX: ["exex-denial"],
  OPSEC: ["opsec-muto"],
  ACSB: ["opsec-muto"],
  HALCYON: ["insurance-cruelty"],
  OCI: ["insurance-cruelty"],
  DOMUS: ["domus-tenant"],
  LUMEN: ["lumen-pricing"],
  SYNOPTIC: ["synoptic-evidence"],
  ANCHOR: ["anchor-logistics"],
  PSA: ["psa-polarization"],
  UNICOL: ["unicol-verified-access"],
  CARBON: ["carbon-adoption"],
};

const visibilityTagHints: Record<SocialVisibility, EventTag[]> = {
  local: ["civilian_harm", "habitat_failure", "verified_access", "psa"],
  inner_worlds: ["public_visibility", "legal_exposure", "oversight", "data_suppression"],
  investor_wire: ["resource_supply", "insurance", "transport", "safety_review", "legal_exposure"],
  settlement_channel: ["civilian_harm", "habitat_failure", "communications", "verified_access", "psa"],
  promoted: ["resource_supply", "fuel_competition", "security_contract"],
};

const eventFamilyAliases = (event: MarketEvent) => {
  const families = new Set<string>();
  for (const family of publicReactionFamilyAliases[event.publicReactionFamily ?? ""] ?? []) families.add(family);
  const semanticActor = event.semanticPattern?.split(":")[0];
  for (const family of semanticFamilyAliases[semanticActor ?? ""] ?? []) families.add(family);
  return families;
};

const semanticFamiliesFor = (event: MarketEvent) => new Set(semanticFamilyAliases[event.semanticPattern?.split(":")[0] ?? ""] ?? []);
const reactionFamiliesFor = (event: MarketEvent) => new Set(publicReactionFamilyAliases[event.publicReactionFamily ?? ""] ?? []);

const countOverlap = <T,>(left: T[] = [], right: T[] = []) => left.reduce((sum, item) => sum + (right.includes(item) ? 1 : 0), 0);

const templateMatchDetails = (template: SocialTemplate, event: MarketEvent) => {
  const actors = eventActors(event);
  const semanticFamilies = semanticFamiliesFor(event);
  const reactionFamilies = reactionFamiliesFor(event);
  const familyAliases = eventFamilyAliases(event);
  const semanticMatch = !!event.semanticPattern && !!template.semanticPatterns?.includes(event.semanticPattern);
  const semanticFamilyMatch = semanticFamilies.has(template.family);
  const reactionFamilyMatch = reactionFamilies.has(template.family) || template.family === event.publicReactionFamily;
  const familyMatch = semanticFamilyMatch || reactionFamilyMatch || familyAliases.has(template.family);
  const actorOverlap = countOverlap(template.actors ?? [], actors);
  const tagOverlap = countOverlap(template.tags, event.tags);
  const visibility = template.visibility;
  const visibilityFit = visibility ? countOverlap(visibilityTagHints[visibility], event.tags) > 0 : false;
  const familyConflict = semanticFamilies.size > 0 && !semanticFamilyMatch && !reactionFamilyMatch && !semanticMatch;
  const strongMatch =
    semanticMatch ||
    semanticFamilyMatch ||
    reactionFamilyMatch ||
    (!familyConflict && actorOverlap > 0 && tagOverlap > 0) ||
    (!familyConflict && tagOverlap >= 2);

  return {
    semanticMatch,
    familyMatch,
    actorOverlap,
    tagOverlap,
    visibilityFit,
    familyConflict,
    strongMatch,
  };
};

const templateSelectionScore = (template: SocialTemplate, event: MarketEvent) => {
  const details = templateMatchDetails(template, event);
  let score = 0;
  if (details.semanticMatch) score += 5;
  if (details.familyMatch) score += 4;
  if (details.actorOverlap > 0) score += 3;
  score += details.tagOverlap * 2;
  if (details.visibilityFit) score += 1;
  if (details.familyConflict) score -= 4;
  if (!details.actorOverlap && !details.semanticMatch) score -= 3;
  if (!details.tagOverlap) score -= 2;
  return score;
};

const selectionNotesFor = (template: SocialTemplate, account: SocialAccount, event: MarketEvent, templateScore: number, accountScore: number) => {
  const details = templateMatchDetails(template, event);
  return [
    `template ${template.id} ${template.family} score ${templateScore}`,
    `account ${account.handle} score ${accountScore}`,
    details.semanticMatch ? "semantic match" : "",
    details.familyMatch ? "family match" : "",
    details.actorOverlap ? `actor overlap ${details.actorOverlap}` : "",
    details.tagOverlap ? `tag overlap ${details.tagOverlap}` : "",
  ].filter(Boolean);
};

const weightedChoice = <T,>(items: Array<{ item: T; score: number }>) => {
  const weighted = items.map(({ item, score }) => ({ item, weight: Math.max(1, score) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.item;
  }
  return weighted[weighted.length - 1]?.item;
};

const topWeightedMatches = <T,>(items: T[], score: (item: T) => number, limit: number, minScore = 1) =>
  items
    .map((item) => ({ item, score: score(item) }))
    .filter(({ score: itemScore }) => itemScore >= minScore)
    .sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 0.9)
    .slice(0, limit);

const scoreAccountForEvent = (account: SocialAccount, event: MarketEvent) => {
  const actors = eventActors(event);
  const tagScore = event.tags.reduce((sum, tag) => sum + (account.caresAboutTags.includes(tag) ? 2 : 0), 0);
  const actorScore = actors.reduce((sum, actor) => sum + (account.preferredActors?.includes(actor) ? 3 : 0), 0);
  const trustScore = actors.reduce((sum, actor) => sum + Math.max(0, account.trusts?.[actor] ?? 0), 0);
  const dislikeScore = actors.reduce((sum, actor) => sum + Math.max(0, account.dislikes?.[actor] ?? 0), 0);
  return tagScore + actorScore + trustScore + dislikeScore;
};

const scoreAccountForTemplate = (account: SocialAccount, template: SocialTemplate, event: MarketEvent) => {
  const actors = eventActors(event);
  const tagScore = countOverlap(account.caresAboutTags, event.tags) * 3;
  const actorScore = actors.reduce((sum, actor) => sum + (account.preferredActors?.includes(actor) ? 3 : 0), 0);
  const trustScore = actors.reduce((sum, actor) => sum + Math.max(0, account.trusts?.[actor] ?? 0), 0);
  const dislikeScore = actors.reduce((sum, actor) => sum + Math.max(0, account.dislikes?.[actor] ?? 0), 0);
  const personaScore = template.personaTypes?.includes(account.personaType) ? 4 : 0;
  const toneScore = template.tones?.includes(account.tone) ? 1 : 0;
  const familyPreference = account.preferredFamilies?.includes(template.family) ? 3 : 0;
  const semanticPreference =
    event.semanticPattern && account.preferredSemanticPatterns?.includes(event.semanticPattern) ? 3 : 0;
  const avoidedFamily = account.avoidedFamilies?.includes(template.family) ? 5 : 0;
  const personaMismatch = template.personaTypes?.length && !template.personaTypes.includes(account.personaType) ? 5 : 0;
  return tagScore + actorScore + trustScore + dislikeScore + personaScore + toneScore + familyPreference + semanticPreference - avoidedFamily - personaMismatch;
};

const recentAccountCount = (accountId: string, recentPosts: SocialPost[]) =>
  recentPosts.slice(0, 12).filter((post) => post.accountId === accountId).length;

const recentTemplateFamilyCount = (family: string, recentPosts: SocialPost[]) =>
  recentPosts.slice(0, 18).filter((post) => post.family === family).length;

const postCountForEvent = (event: MarketEvent) => {
  const highVisibility =
    event.severity === "material" ||
    event.tags.includes("public_visibility") ||
    event.tags.includes("civilian_harm") ||
    event.tags.includes("footage_leak") ||
    event.tags.includes("denial") ||
    event.tags.includes("verified_access") ||
    event.tags.includes("habitat_failure") ||
    event.tags.includes("oversight");

  if (highVisibility && Math.random() > 0.16) return event.severity === "material" ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
  if (event.category === "Market Note" && Math.random() > 0.55) return 1;
  return Math.random() > 0.72 ? 1 : 0;
};

const renderTemplate = (template: string, event: MarketEvent) => {
  const actors = eventActors(event);
  const primary = actors[0] ?? "EXEX";
  const institution = actors.find(isInstitutionId) ?? (event.tags.includes("psa") ? "PSA" : "UNICOL");
  const positiveActor = Object.entries(event.impacts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? primary;
  const negativeActor = Object.entries(event.impacts).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))[0]?.[0] ?? primary;
  const slots: Record<string, string> = {
    actor: actorName(primary),
    actorTicker: compactActor(primary),
    institution: actorName(institution),
    institutionTicker: compactActor(institution),
    positiveActor: actorName(positiveActor),
    negativeActor: actorName(negativeActor),
    headline: event.headline,
  };

  return template.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? "");
};

const sentimentIntensity = (event: MarketEvent, sentiment: SocialSentiment) => {
  const severity = event.severity === "material" ? 72 : event.severity === "warning" ? 48 : 26;
  const publicBoost = event.tags.includes("public_visibility") || event.publicReaction ? 14 : 0;
  const sentimentBoost = sentiment === "polarizing" || sentiment === "critical" || sentiment === "fearful" ? 10 : 0;
  return Math.round(clamp(severity + publicBoost + sentimentBoost + Math.random() * 9, 8, 98));
};

const visibilityFor = (template: SocialTemplate, account: SocialAccount): SocialVisibility => {
  if (template.visibility) return template.visibility;
  if (account.personaType === "settler" || account.personaType === "psa_local") return "settlement_channel";
  if (account.personaType === "investor" || account.personaType === "analyst" || account.personaType === "exex_holder") return "investor_wire";
  if (account.personaType === "bot_or_promoted" || account.personaType === "carbon_aligned") return "promoted";
  return "inner_worlds";
};

const socialInstitutionImpacts = (posts: SocialPost[]): Partial<Record<InstitutionId, InstitutionImpact>> => {
  if (!posts.length) return {};
  const has = (predicate: (post: SocialPost) => boolean) => posts.some(predicate);
  const impacts: Partial<Record<InstitutionId, InstitutionImpact>> = {};

  if (has((post) => post.relatedActors.includes("UNICOL") && (post.sentiment === "supportive" || post.sentiment === "neutral"))) {
    impacts.UNICOL = { ...(impacts.UNICOL ?? {}), publicTrust: 1, credibility: 1 };
  }

  if (has((post) => post.relatedActors.includes("UNICOL") && (post.sentiment === "critical" || post.sentiment === "fearful"))) {
    impacts.UNICOL = {
      ...(impacts.UNICOL ?? {}),
      publicTrust: (impacts.UNICOL?.publicTrust ?? 0) - 1,
    };
  }

  if (has((post) => post.relatedActors.includes("PSA") && post.personaType === "psa_local" && post.sentiment === "supportive")) {
    impacts.PSA = { ...(impacts.PSA ?? {}), publicTrust: 1, credibility: 1 };
  }

  if (has((post) => post.relatedActors.includes("PSA") && (post.sentiment === "critical" || post.sentiment === "polarizing"))) {
    impacts.PSA = {
      ...(impacts.PSA ?? {}),
      publicTrust: (impacts.PSA?.publicTrust ?? 0) - 1,
    };
  }

  return impacts;
};

export const generateSocialPostsForEvent = ({
  event,
  market,
  institutionsState,
  recentPosts,
}: {
  event: MarketEvent;
  market: MarketState;
  institutionsState: InstitutionState;
  recentPosts: SocialPost[];
}): PublicPulseResult => {
  const desiredCount = postCountForEvent(event);
  if (!desiredCount) return { posts: [], institutionImpacts: {} };

  const posts: SocialPost[] = [];
  const usedTemplates = new Set<string>();
  const usedAccounts = new Set<string>();

  for (let index = 0; index < desiredCount; index += 1) {
    const templatePool = topWeightedMatches(
      socialTemplates.filter(
        (template) =>
          !usedTemplates.has(template.id) &&
          recentTemplateFamilyCount(template.family, recentPosts) < 3 &&
          templateMatchDetails(template, event).strongMatch,
      ),
      (template) => templateSelectionScore(template, event),
      8,
      4,
    );
    const template = weightedChoice(templatePool);

    if (!template) continue;

    const templateScore = templateSelectionScore(template, event);
    const accountCandidates = topWeightedMatches(
      socialAccounts.filter(
        (account) =>
          !usedAccounts.has(account.id) &&
          recentAccountCount(account.id, recentPosts) < 2 &&
          (!template.personaTypes || template.personaTypes.includes(account.personaType)),
      ),
      (account) => scoreAccountForTemplate(account, template, event),
      12,
      2,
    );
    const fallbackAccountCandidates = accountCandidates.length
      ? accountCandidates
      : topWeightedMatches(
          socialAccounts.filter((account) => !usedAccounts.has(account.id) && recentAccountCount(account.id, recentPosts) < 2),
          (account) => scoreAccountForEvent(account, event),
          8,
          1,
        );
    const account = weightedChoice(fallbackAccountCandidates);

    if (!account) continue;

    const accountScore = scoreAccountForTemplate(account, template, event);

    usedAccounts.add(account.id);
    usedTemplates.add(template.id);
    const relatedActors = Array.from(new Set(eventActors(event).map(compactActor)));
    const eventTags = event.tags.slice(0, 4);
    const text = renderTemplate(template.text, event);

    if (recentPosts.slice(0, 24).some((post) => post.text === text)) continue;

    posts.push({
      id: `pulse-${event.id}-${account.id}-${template.id}-${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
      simulatedTime: event.simulatedLabel ?? "LIVE",
      accountId: account.id,
      handle: account.handle,
      displayName: account.displayName,
      role: account.role,
      origin: account.origin,
      text,
      tags: Array.from(new Set([...eventTags, ...template.tags])).slice(0, 5),
      relatedEventId: event.id,
      relatedActors,
      sentiment: template.sentiment,
      intensity: sentimentIntensity(event, template.sentiment),
      personaType: account.personaType,
      visibility: visibilityFor(template, account),
      templateId: template.id,
      family: template.family,
      selectionScore: templateScore + accountScore,
      selectionNotes: selectionNotesFor(template, account, event, templateScore, accountScore),
    });
  }

  const cappedPosts = posts.slice(0, 3);
  const institutionImpacts = socialInstitutionImpacts(cappedPosts);

  // Read these state objects so the API remains future-proof without letting
  // Public Pulse dominate market mechanics in this spike.
  void market;
  void institutionsState;

  return { posts: cappedPosts, institutionImpacts };
};

const countBy = <T,>(items: T[], keyFor: (item: T) => string) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(keyFor(item), (counts.get(keyFor(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const summarizePublicPulse = (posts: SocialPost[] = []): PublicPulseSummary => {
  const recent = posts.slice(0, 60);
  const sentiments = countBy(recent, (post) => post.sentiment);
  const topics = countBy(
    recent.flatMap((post) => post.tags),
    (tag) => tag,
  )
    .slice(0, 6)
    .map(([tag]) => tag);
  const personaTypes = countBy(recent, (post) => post.personaType)
    .slice(0, 5)
    .map(([persona, count]) => `${persona}: ${count}`);
  const sentimentTags = sentiments.slice(0, 5).map(([sentiment, count]) => `${sentiment}: ${count}`);
  const saturationContributions = countBy(
    recent.filter((post) => post.intensity >= 65),
    (post) => post.family ?? post.sentiment,
  )
    .slice(0, 5)
    .map(([family, count]) => `${family}: ${count}`);
  const selectionNotes = recent
    .filter((post) => post.selectionNotes?.length)
    .slice(0, 5)
    .map((post) => `${post.handle}: ${(post.selectionNotes ?? []).join("; ")}`);

  return {
    dominantSentiment: sentiments[0] ? `${sentiments[0][0]} (${sentiments[0][1]})` : "quiet",
    mostActiveTopics: topics,
    samplePosts: recent.slice(0, 3),
    recentPostCount: recent.length,
    topPersonaTypes: personaTypes,
    topSentimentTags: sentimentTags,
    saturationContributions,
    selectionNotes,
  };
};
