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

const scoreAccountForEvent = (account: SocialAccount, event: MarketEvent) => {
  const actors = eventActors(event);
  const tagScore = event.tags.reduce((sum, tag) => sum + (account.caresAboutTags.includes(tag) ? 2 : 0), 0);
  const actorScore = actors.reduce((sum, actor) => sum + (account.preferredActors?.includes(actor) ? 3 : 0), 0);
  const trustScore = actors.reduce((sum, actor) => sum + Math.max(0, account.trusts?.[actor] ?? 0), 0);
  const dislikeScore = actors.reduce((sum, actor) => sum + Math.max(0, account.dislikes?.[actor] ?? 0), 0);
  return tagScore + actorScore + trustScore + dislikeScore;
};

const scoreTemplateForEvent = (template: SocialTemplate, event: MarketEvent, account: SocialAccount) => {
  const actors = eventActors(event);
  const tagScore = event.tags.reduce((sum, tag) => sum + (template.tags.includes(tag) ? 2 : 0), 0);
  const actorScore = actors.reduce((sum, actor) => sum + (template.actors?.includes(actor) ? 3 : 0), 0);
  const semanticScore = template.semanticPatterns?.includes(event.semanticPattern ?? "") ? 5 : 0;
  const personaScore = template.personaTypes?.includes(account.personaType) ? 3 : 0;
  const toneScore = template.tones?.includes(account.tone) ? 1 : 0;
  return tagScore + actorScore + semanticScore + personaScore + toneScore;
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

const topMatches = <T,>(items: T[], score: (item: T) => number, limit: number) =>
  items
    .map((item) => ({ item, score: score(item) }))
    .filter(({ score: itemScore }) => itemScore > 0)
    .sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 1.4)
    .slice(0, limit)
    .map(({ item }) => item);

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

  const eligibleAccounts = topMatches(
    socialAccounts.filter((account) => recentAccountCount(account.id, recentPosts) < 2),
    (account) => scoreAccountForEvent(account, event),
    14,
  );
  const accounts = eligibleAccounts.length ? eligibleAccounts : socialAccounts.slice(0, 10);
  const posts: SocialPost[] = [];
  const usedTemplates = new Set<string>();
  const usedAccounts = new Set<string>();

  for (let index = 0; index < desiredCount; index += 1) {
    const accountPool = accounts.filter((account) => !usedAccounts.has(account.id));
    const account = choice(accountPool.length ? accountPool : accounts);
    const templatePool = topMatches(
      socialTemplates.filter(
        (template) =>
          !usedTemplates.has(template.id) &&
          recentTemplateFamilyCount(template.family, recentPosts) < 3 &&
          (!template.personaTypes || template.personaTypes.includes(account.personaType)),
      ),
      (template) => scoreTemplateForEvent(template, event, account),
      8,
    );
    const template = templatePool.length ? choice(templatePool) : undefined;

    if (!template) continue;

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

  return {
    dominantSentiment: sentiments[0] ? `${sentiments[0][0]} (${sentiments[0][1]})` : "quiet",
    mostActiveTopics: topics,
    samplePosts: recent.slice(0, 3),
    recentPostCount: recent.length,
    topPersonaTypes: personaTypes,
    topSentimentTags: sentimentTags,
    saturationContributions,
  };
};
