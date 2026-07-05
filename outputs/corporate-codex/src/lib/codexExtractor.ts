import { codexDocuments } from "../data/documents";

export type LoreAtom = {
  id: string;
  kind:
    | "actor"
    | "institution"
    | "place"
    | "term"
    | "quote"
    | "headline"
    | "phrase"
    | "report_line"
    | "public_reaction";
  text: string;
  sourceDoc: string;
  tags: string[];
};

const fallbackAtoms: LoreAtom[] = [
  { id: "fallback-unresolved-thermal", kind: "phrase", text: "unresolved thermal signatures", sourceDoc: "manual", tags: ["unicol", "footage_leak"] },
  { id: "fallback-mandate-limited", kind: "phrase", text: "mandate-limited response", sourceDoc: "manual", tags: ["unicol"] },
  { id: "fallback-legal-managed", kind: "term", text: "Legal exposure: managed", sourceDoc: "manual", tags: ["legal_exposure"] },
  { id: "fallback-opsec-continuity", kind: "quote", text: "OPSEC does not threaten. OPSEC guarantees continuity.", sourceDoc: "manual", tags: ["OPSEC", "security_contract"] },
  { id: "fallback-managed-future", kind: "quote", text: "The future is not peaceful. The future is managed.", sourceDoc: "manual", tags: ["OPSEC"] },
  { id: "fallback-fatality-delay", kind: "headline", text: "Fatality recognition delayed pending signal confirmation.", sourceDoc: "manual", tags: ["HALCYON", "insurance"] },
  { id: "fallback-civilian-disruption", kind: "phrase", text: "civilian movement disruption", sourceDoc: "manual", tags: ["civilian_harm"] },
  { id: "fallback-confidentiality", kind: "phrase", text: "commercial confidentiality", sourceDoc: "manual", tags: ["EXEX", "legal_exposure"] },
  { id: "fallback-infrastructure", kind: "phrase", text: "critical infrastructure continuity", sourceDoc: "manual", tags: ["EXEX", "pipeline"] },
  { id: "fallback-corridor", kind: "place", text: "Corridor 12-B", sourceDoc: "manual", tags: ["place", "civilian_harm"] },
  { id: "fallback-flare-window", kind: "place", text: "flare blackout window", sourceDoc: "manual", tags: ["flare", "communications"] },
  { id: "fallback-north-belt", kind: "place", text: "north equatorial extraction belt", sourceDoc: "manual", tags: ["extraction", "resource_supply"] },
  { id: "fallback-pxb", kind: "term", text: "Proxima Resource Futures", sourceDoc: "manual", tags: ["PXB-X", "resource_supply"] },
];

const labelHints = [
  "Core phrase",
  "Core line",
  "Example Headlines",
  "Public Language",
  "Risk Tags",
  "Excerpt",
  "Use",
  "Format",
];

const tickerWords = ["EXEX", "OPSEC", "SYNOPTIC", "LUMEN", "HALCYON", "DOMUS", "PXB-X", "OCI", "ACSB", "UNICOL", "PSA"];

const clean = (line: string) =>
  line
    .replace(/^[-*]\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]\s*$/, "");

const isUseful = (text: string) =>
  text.length >= 8 &&
  text.length <= 150 &&
  !text.startsWith("---") &&
  !text.startsWith("This document") &&
  !text.includes("can be used as") &&
  !text.includes("approved in-universe media tones");

const classify = (text: string, context: string, filename: string): LoreAtom["kind"] => {
  const combined = `${context} ${text}`;

  if (filename.includes("MEDIA") && /Public Reaction|internet comments|Completely normal|PDF|cursed|legal review/i.test(combined)) {
    return "public_reaction";
  }

  if (/^["']|^вЂњ|^вЂ/.test(text) || context.includes("Excerpt")) {
    return "quote";
  }

  if (/Example Headlines|Headline/i.test(context) || /reports|denies|issues|withheld|delays|announces|cites/i.test(text)) {
    return "headline";
  }

  if (/Corridor|Proxima|Sector|Belt|Station|Junction|Post|window/i.test(text)) {
    return "place";
  }

  if (/UNICOL|PSA|Authority|Mission|Office/i.test(text)) {
    return "institution";
  }

  if (tickerWords.some((word) => text.includes(word))) {
    return "actor";
  }

  if (/Public Language|Core phrase|Core line/i.test(context)) {
    return "phrase";
  }

  if (/Risk Tags|Legal|Visibility|Exposure|Signal|Mandate/i.test(combined)) {
    return "term";
  }

  return filename.includes("MEDIA") ? "report_line" : "phrase";
};

const tagsFor = (text: string, context: string) => {
  const combined = `${text} ${context}`;
  const tags = tickerWords.filter((word) => combined.toUpperCase().includes(word));

  if (/flare|blackout|relay|bandwidth|signal/i.test(combined)) tags.push("communications");
  if (/corridor|civilian|shelter|habitat|water|oxygen/i.test(combined)) tags.push("civilian_harm");
  if (/pipeline|resource|concentrate|extraction/i.test(combined)) tags.push("resource_supply");
  if (/legal|confidentiality|review|liability/i.test(combined)) tags.push("legal_exposure");
  if (/footage|thermal|imagery|sensor/i.test(combined)) tags.push("footage_leak");
  if (/contract|continuity|security|MUTO|unmanned/i.test(combined)) tags.push("security_contract");

  return Array.from(new Set(tags));
};

export const extractCodexAtoms = (): LoreAtom[] => {
  const atoms: LoreAtom[] = [];
  const seen = new Set<string>();
  const docCounts = new Map<string, number>();
  const maxAtomsPerDocument = 56;

  const add = (text: string, sourceDoc: string, context: string) => {
    const normalized = clean(text);
    const key = normalized.toLowerCase();

    if (!isUseful(normalized) || seen.has(key)) return;
    if ((docCounts.get(sourceDoc) ?? 0) >= maxAtomsPerDocument) return;

    seen.add(key);
    docCounts.set(sourceDoc, (docCounts.get(sourceDoc) ?? 0) + 1);
    atoms.push({
      id: `${sourceDoc.replace(/\W+/g, "-").toLowerCase()}-${atoms.length}`,
      kind: classify(normalized, context, sourceDoc),
      text: normalized,
      sourceDoc,
      tags: tagsFor(normalized, context),
    });
  };

  for (const document of codexDocuments) {
    const lines = document.content.split("\n");
    let context = document.title;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        context = clean(heading[2]);
        add(heading[2], document.filename, context);
        return;
      }

      const label = trimmed.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
      if (label) {
        const labelName = clean(label[1]);
        context = labelHints.some((hint) => labelName.includes(hint)) ? labelName : context;
        add(label[2], document.filename, labelName);
        return;
      }

      if (/^[-*]\s+/.test(trimmed) || trimmed.startsWith(">")) {
        add(trimmed, document.filename, context);
        return;
      }

      if (document.filename.includes("MEDIA") && trimmed.length <= 145) {
        add(trimmed, document.filename, context);
      }
    });
  }

  for (const atom of fallbackAtoms) {
    if (!seen.has(atom.text.toLowerCase())) {
      atoms.push(atom);
    }
  }

  return atoms;
};

export const loreAtoms = extractCodexAtoms();

export const loreAtomStats = loreAtoms.reduce<Record<LoreAtom["kind"], number>>(
  (stats, atom) => {
    stats[atom.kind] += 1;
    return stats;
  },
  {
    actor: 0,
    institution: 0,
    place: 0,
    term: 0,
    quote: 0,
    headline: 0,
    phrase: 0,
    report_line: 0,
    public_reaction: 0,
  },
);
