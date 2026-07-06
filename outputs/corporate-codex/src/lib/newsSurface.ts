import type { EntityId } from "../data/entities";
import type { EventTag, MarketEvent } from "../data/events";
import { classifyEventStorylineLanes, type StorylineLaneId } from "../data/storylineLanes";
import type { WorldStateModifier, WorldStateModifierId } from "../data/worldStateModifiers";
import type { MarketRegime } from "./marketModel";

type SurfaceVariants = {
  headlines?: string[];
  bodies?: string[];
  marketState?: string[];
};

export type NewsSurfaceInput = {
  semanticPattern: string;
  headlineTemplates: string[];
  bodyTemplates: string[];
  marketStateTemplates: string[];
  tags: EventTag[];
  involvedActors: EntityId[];
  publicReactionFamily?: string;
  marketRegime: MarketRegime;
  phase: string;
  worldModifier?: WorldStateModifier;
};

export type NewsSurfaceResult = {
  headlineTemplates: string[];
  bodyTemplates: string[];
  marketStateTemplates: string[];
  surfaceContextNote?: string;
};

const semanticVariants: Record<string, SurfaceVariants> = {
  "EXEX:blanket_denial": {
    headlines: ["EXEX restates licensed-scope position as PSA filings remain unresolved."],
    bodies: ["Counsel kept contractor routing outside the disclosure perimeter while desks treated the denial as duration management."],
    marketState: ["Surface emphasized licensing pressure and counsel-managed disclosure without changing EXEX impact logic."],
  },
  "EXEX:partial_telemetry_release": {
    headlines: ["EXEX publishes counsel-screened telemetry as evidence custody questions widen."],
    bodies: ["The partial release improved the evidentiary record without settling who controlled the contractor route."],
    marketState: ["Surface framed partial telemetry as controlled evidence, not resolution."],
  },
  "EXEX:investor_call": {
    headlines: ["EXEX briefs holders on route continuity while liability questions stay counsel-bound."],
    bodies: ["Management sold asset coverage and alternate capacity as continuity math rather than a settlement of corridor exposure."],
    marketState: ["Surface kept investor reassurance tied to unresolved control rights."],
  },
  "ANCHOR:cargo_window_delay": {
    headlines: ["Anchorpoint rolls transfer window as delivery confidence narrows around hazard premiums."],
    bodies: ["Scarcity remained visible, but cargo desks marked down monetizable delivery through the transfer lattice."],
    marketState: ["Surface emphasized cargo confidence rather than raw resource scarcity."],
  },
  "ANCHOR:alternate_transfer_route": {
    headlines: ["Anchorpoint clears limited alternate slot with hazard pricing still attached."],
    bodies: ["The route update repaired one bottleneck while keeping formal corridor control and delivery assumptions unresolved."],
    marketState: ["Surface treated alternate routing as constrained recovery, not clean de-escalation."],
  },
  "LUMEN:observer_bandwidth_failure": {
    headlines: ["LUMEN observer bandwidth degrades while priority traffic remains billable."],
    bodies: ["Relay access moved from infrastructure issue to allocation signal as observer channels stayed behind paid routes."],
    marketState: ["Surface made relay failure about access incentives, not only flare weather."],
  },
  "LUMEN:relay_stabilization": {
    headlines: ["LUMEN stabilizes observer route without removing priority-access politics."],
    bodies: ["Signal quality improved, but desks kept pricing the service-tier question inside the relay shelf."],
    marketState: ["Surface framed relay stabilization as range maintenance."],
  },
  "SYNOPTIC:archive_discrepancy": {
    headlines: ["Archive timing discrepancy reopens SYNOPTIC evidence-custody review."],
    bodies: ["Clients asked whether paid verification access had become a custody defense rather than an evidence product."],
    marketState: ["Surface emphasized custody risk around controlled evidence access."],
  },
  "SYNOPTIC:redacted_stills_release": {
    headlines: ["SYNOPTIC releases redacted stills while chain-of-custody questions stay open."],
    bodies: ["The stills narrowed the dispute but left enough missing context for desks to keep legal exposure in the tape."],
    marketState: ["Surface treated redaction as partial control, not disclosure completion."],
  },
  "HALCYON:fatality_delay": {
    headlines: ["HALCYON extends casualty-recognition review as exclusion language remains live."],
    bodies: ["Underwriters kept the missing outside the accounting event while reserve logic stayed visible to the market."],
    marketState: ["Surface emphasized recognition delay as accounting incentive."],
  },
  "HALCYON:regulatory_half_life": {
    headlines: ["HALCYON exclusion language loses reserve benefit under renewed review."],
    bodies: ["The delay trade moved from underwriting discipline toward litigation duration as public visibility persisted."],
    marketState: ["Surface framed regulatory half-life as the cost of repeated casualty deferral."],
  },
  "DOMUS:service_interruption": {
    headlines: ["DOMUS service interruption exposes registered-structure dependency in S-4."],
    bodies: ["Residents were kept inside the contract architecture while emergency procurement treated life support as a service issue."],
    marketState: ["Surface made habitat stress about dependency and procurement, not only failure."],
  },
  "DOMUS:verified_restoration": {
    headlines: ["DOMUS restores access under verification while reconstruction terms remain conditional."],
    bodies: ["The restoration reduced immediate ambiguity but left the settlement inside a managed service dependency."],
    marketState: ["Surface treated restoration as conditional stabilization."],
  },
  "OPSEC:muto_feed_leak": {
    headlines: ["Leaked MUTO feed exposes classification gaps in OPSEC corridor work."],
    bodies: ["The footage did not change the perimeter, but it made contractor deniability more expensive to defend."],
    marketState: ["Surface emphasized autonomous classification risk around contractor exposure."],
  },
  "OPSEC:oversight_liability": {
    headlines: ["Oversight filing turns OPSEC continuity work into contractor-liability exposure."],
    bodies: ["Insurers and counsel repriced the same security demand through authorization gaps and archived telemetry."],
    marketState: ["Surface converted OPSEC demand into liability accumulation."],
  },
  "PSA:directive_low_enforcement": {
    headlines: ["PSA issues corridor directive with enforcement still visibly limited."],
    bodies: ["The order added administrative weight while field compliance remained outside confirmed capacity."],
    marketState: ["Surface kept PSA pressure legal, not coercive."],
  },
  "PSA:licensing_objection": {
    headlines: ["PSA licensing objection gains procedural weight from verified-access evidence."],
    bodies: ["The filing improved legal posture without turning paperwork into near-term corridor control."],
    marketState: ["Surface separated mandate credibility from enforcement capacity."],
  },
  "PSA:unenforced_directive_expiry": {
    headlines: ["PSA halt request expires without confirmed compliance notice."],
    bodies: ["The authority retained the filing trail, but desks treated noncompliance as another priceable administrative remainder."],
    marketState: ["Surface punished expired paper authority without changing PSA metrics directly."],
  },
  "MARKET:ambient_note": {
    headlines: [
      "Trading range narrows as unresolved logistics and liability inputs offset.",
      "Desks price duration rather than surprise inside the managed risk band.",
      "Market pauses as stabilizing signals carry legal remainders.",
    ],
    bodies: [
      "No single input cleared the dispute; transport, verification, and liability signals kept cancelling into low-conviction tape.",
      "Stabilization held the range without making recovery legible enough for a clean directional move.",
      "The market had no clean direction because every stabilizing input still carried an unresolved administrative cost.",
    ],
    marketState: [
      "Surface used ambient tape language for unresolved but priced risk.",
      "Surface framed the pause as duration pricing rather than recovery.",
    ],
  },
};

const laneVariants: Partial<Record<StorylineLaneId, SurfaceVariants>> = {
  "corridor-12b-licensing": {
    marketState: ["Lane context emphasized permits, PSA filings, and commercial confidentiality."],
  },
  "fatality-recognition-dispute": {
    marketState: ["Lane context emphasized casualty accounting, exclusion language, and reserve logic."],
  },
  "relay-access-crisis": {
    marketState: ["Lane context emphasized observer bandwidth, paid routes, and signal access."],
  },
  "cargo-sovereignty-dispute": {
    marketState: ["Lane context emphasized cargo confidence, transfer windows, and hazard premiums."],
  },
  "muto-classification-inquiry": {
    marketState: ["Lane context emphasized autonomous classification, contractor deniability, and archive footage."],
  },
  "habitat-dependency-crisis": {
    marketState: ["Lane context emphasized registered structures, life-support service, and reconstruction dependency."],
  },
};

const modifierVariants: Partial<Record<WorldStateModifierId, Record<string, SurfaceVariants>>> = {
  "severe-flare-window": {
    "ANCHOR:cargo_window_delay": {
      headlines: ["Anchorpoint delays cargo window as flare interference degrades transfer confirmation."],
      bodies: ["Relay interference turned cargo timing into a verification problem rather than a simple slot delay."],
    },
    "LUMEN:observer_bandwidth_failure": {
      headlines: ["LUMEN observer route fails inside stronger-than-forecast flare window."],
      bodies: ["The flare window made priority routing look less like resilience and more like rationed signal access."],
    },
    "UNICOL:access_window_expired": {
      headlines: ["UNICOL access window expires as flare noise delays corridor verification."],
    },
    "SYNOPTIC:archive_discrepancy": {
      headlines: ["Archive timestamps diverge as flare interference complicates evidence custody."],
    },
  },
  "quiet-capital-backstop": {
    "EXEX:investor_call": {
      headlines: ["EXEX investor call prices continuity as long-horizon desks seek control rights."],
      bodies: ["The backstop reduced immediate stress while moving future reconstruction leverage into quieter hands."],
    },
    "ANCHOR:alternate_transfer_route": {
      headlines: ["Anchorpoint alternate route clears as capital desks price control optionality."],
    },
    "ANCHOR:cargo_window_delay": {
      headlines: ["Anchorpoint rolls shipment window while long-horizon desks price control rights into recovery."],
    },
    "DOMUS:verified_restoration": {
      headlines: ["DOMUS restoration steadies as backstop capital attaches reconstruction leverage."],
    },
    "MARKET:ambient_note": {
      headlines: ["Long-horizon desks treat the pause as control optionality, not recovery."],
      bodies: ["The tape stabilized because future leverage became more legible than the present dispute."],
    },
  },
  "smuggler-route-opens": {
    "ANCHOR:cargo_window_delay": {
      headlines: ["Formal cargo window slips as unlicensed transfer channels distort delivery assumptions."],
    },
    "ANCHOR:alternate_transfer_route": {
      headlines: ["Anchorpoint alternate routing clears against shadow-transfer price discovery."],
    },
    "PSA:unenforced_directive_expiry": {
      headlines: ["PSA request expires as unlicensed transfer channels move around formal control."],
    },
    "MARKET:ambient_note": {
      headlines: ["Shadow logistics keep the tape inside range while formal routes lose signal value."],
    },
  },
  "archive-mirror-leak": {
    "SYNOPTIC:archive_discrepancy": {
      headlines: ["Mirrored archive deepens SYNOPTIC custody discrepancy outside controlled access."],
      bodies: ["The mirror did not settle the evidence question; it broke the monopoly on who could ask it."],
    },
    "SYNOPTIC:redacted_stills_release": {
      headlines: ["SYNOPTIC redactions face mirror-archive comparison as access control weakens."],
    },
    "OPSEC:muto_feed_leak": {
      headlines: ["Mirror archive pushes OPSEC MUTO footage beyond contractor-controlled channels."],
    },
    "EXEX:partial_telemetry_release": {
      headlines: ["EXEX telemetry release narrows exposure after mirror archive widens custody pressure."],
    },
  },
  "habitat-tenant-strike": {
    "DOMUS:service_interruption": {
      headlines: ["DOMUS interruption spreads as registered-structure refusal exposes service dependency."],
    },
    "DOMUS:verified_restoration": {
      headlines: ["DOMUS restoration clears only under contested reconstruction terms."],
    },
    "PSA:directive_low_enforcement": {
      headlines: ["PSA directive enters tenant-service dispute with enforcement still limited."],
    },
  },
  "inner-worlds-oversight-committee": {
    "HALCYON:regulatory_half_life": {
      headlines: ["Oversight committee review narrows HALCYON room on casualty-recognition delays."],
    },
    "OPSEC:oversight_liability": {
      headlines: ["Committee scope turns OPSEC corridor work into formal oversight exposure."],
    },
    "SYNOPTIC:archive_discrepancy": {
      headlines: ["Inner Worlds review pulls archive discrepancy into evidence-custody scope."],
    },
    "EXEX:partial_telemetry_release": {
      headlines: ["EXEX partial telemetry lands inside committee evidence-custody review."],
    },
  },
  "liberation-front-broadcast": {
    "OPSEC:muto_feed_leak": {
      headlines: ["Broadcast networks push OPSEC MUTO footage into public evidence channels."],
    },
    "SYNOPTIC:archive_discrepancy": {
      headlines: ["Anti-corporate broadcast amplifies SYNOPTIC archive timing discrepancy."],
    },
    "EXEX:blanket_denial": {
      headlines: ["EXEX denial lands after testimony broadcast widens corridor liability pressure."],
    },
    "HALCYON:regulatory_half_life": {
      headlines: ["Broadcast testimony adds duration risk to HALCYON casualty-recognition review."],
    },
  },
  "psa-militia-formation": {
    "PSA:directive_low_enforcement": {
      headlines: ["PSA directive hardens rhetorically as ad-hoc enforcement pressure builds."],
      bodies: ["The signal raised local pressure without proving that PSA had converted paperwork into force."],
    },
    "PSA:licensing_objection": {
      headlines: ["PSA licensing objection gains edge from informal enforcement talk."],
    },
    "OPSEC:oversight_liability": {
      headlines: ["OPSEC liability widens as local enforcement talk complicates contractor authority."],
    },
    "EXEX:blanket_denial": {
      headlines: ["EXEX restates separation language as PSA hardliners test informal authority."],
    },
  },
};

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const pseudoEventFor = (input: NewsSurfaceInput): MarketEvent => ({
  id: "surface-context",
  category: "Market Note",
  tags: input.tags,
  headline: "",
  summary: "",
  involvedActors: input.involvedActors,
  impacts: {},
  institutionImpacts: {},
  mediaSnippet: "",
  severity: "notice",
  semanticPattern: input.semanticPattern,
  publicReactionFamily: input.publicReactionFamily,
});

export const realizeDirectorNewsSurface = (input: NewsSurfaceInput): NewsSurfaceResult => {
  const lane = classifyEventStorylineLanes(pseudoEventFor(input));
  const semantic = semanticVariants[input.semanticPattern] ?? {};
  const laneContext = laneVariants[lane.primaryLaneId] ?? {};
  const modifier = input.worldModifier ? modifierVariants[input.worldModifier.id]?.[input.semanticPattern] : undefined;
  const plateauContext =
    input.semanticPattern === "MARKET:ambient_note" && (input.marketRegime === "MANAGED_PLATEAU" || input.marketRegime === "POST_CRISIS_PLATEAU")
      ? {
          headlines: ["Managed plateau holds as unresolved pressure moves from shock to duration."],
          bodies: ["The range held because desks no longer priced surprise, only the cost of waiting for cleaner authority and access signals."],
          marketState: ["Surface used managed-plateau context for ambient tape language."],
        }
      : undefined;

  const contextNotes = [
    `Surface text used ${lane.primaryLaneTitle} lane context for ${input.semanticPattern}`,
    input.worldModifier && modifier ? `Surface text used ${input.worldModifier.title} context for ${input.semanticPattern}` : "",
    plateauContext ? `Surface text used ${input.marketRegime.replace(/_/g, " ").toLowerCase()} regime context for ${input.semanticPattern}` : "",
  ].filter(Boolean);

  return {
    headlineTemplates: unique([
      ...input.headlineTemplates,
      ...(semantic.headlines ?? []),
      ...(modifier?.headlines ?? []),
      ...(plateauContext?.headlines ?? []),
    ]),
    bodyTemplates: unique([
      ...input.bodyTemplates,
      ...(semantic.bodies ?? []),
      ...(modifier?.bodies ?? []),
      ...(plateauContext?.bodies ?? []),
    ]),
    marketStateTemplates: unique([
      ...input.marketStateTemplates,
      ...(semantic.marketState ?? []),
      ...(laneContext.marketState ?? []),
      ...(modifier?.marketState ?? []),
      ...(plateauContext?.marketState ?? []),
    ]),
    surfaceContextNote: contextNotes.join("; "),
  };
};
