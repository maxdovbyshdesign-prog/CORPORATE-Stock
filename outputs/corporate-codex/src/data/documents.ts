import loreBible from "../../content/corporate/CORPORATE_LORE_BIBLE.md?raw";
import entitiesSource from "../../content/corporate/CORPORATE_ENTITIES.md?raw";
import mediaFragments from "../../content/corporate/CORPORATE_MEDIA_FRAGMENTS.md?raw";
import toneGuide from "../../content/corporate/CORPORATE_TONE_GUIDE.md?raw";
import siteBrief from "../../content/corporate/CORPORATE_CODEX_SITE_BRIEF.md?raw";

export type CodexDocumentId = "lore-bible" | "entities" | "media-fragments" | "tone-guide" | "site-brief";

export type CodexDocument = {
  id: CodexDocumentId;
  title: string;
  filename: string;
  category: "Canon" | "Market Source" | "Media" | "Design";
  summary: string;
  content: string;
};

export type MediaFragment = {
  id: string;
  source: string;
  kind: "Breaking" | "Analyst Note" | "Official Statement" | "Observer Update" | "Public Reaction";
  time: string;
  documentId: CodexDocumentId;
  section: string;
  body: string;
};

export const codexDocuments: CodexDocument[] = [
  {
    id: "lore-bible",
    title: "CORPORATE Lore Bible",
    filename: "CORPORATE_LORE_BIBLE.md",
    category: "Canon",
    summary: "Working canon for Proxima, the main organizations, MUTO, and the intended feeling of the setting.",
    content: loreBible,
  },
  {
    id: "entities",
    title: "Entities and Market Data Source",
    filename: "CORPORATE_ENTITIES.md",
    category: "Market Source",
    summary: "Canonical entity notes, public language, risks, relationships, and headline examples.",
    content: entitiesSource,
  },
  {
    id: "media-fragments",
    title: "Media Fragments",
    filename: "CORPORATE_MEDIA_FRAGMENTS.md",
    category: "Media",
    summary: "Press briefings, observer reports, PSA directives, public reaction, and analyst language.",
    content: mediaFragments,
  },
  {
    id: "tone-guide",
    title: "Tone Guide",
    filename: "CORPORATE_TONE_GUIDE.md",
    category: "Design",
    summary: "Rules for keeping the site grounded, corporate, restrained, and unsettling.",
    content: toneGuide,
  },
  {
    id: "site-brief",
    title: "Codex Site Brief",
    filename: "CORPORATE_CODEX_SITE_BRIEF.md",
    category: "Design",
    summary: "Implementation notes for the living lore codex and market-interface structure.",
    content: siteBrief,
  },
];

export const getDocument = (id: string) => codexDocuments.find((document) => document.id === id) ?? codexDocuments[0];

export const titleFromMarkdown = (markdown: string) =>
  markdown
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();

export const stripMarkdown = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const extractSection = (markdown: string, heading: string) => {
  const lines = markdown.split("\n");
  const headingIndex = lines.findIndex((line) => {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    return match?.[2].trim() === heading;
  });

  if (headingIndex === -1) {
    return markdown;
  }

  const headingLevel = lines[headingIndex].match(/^#+/)?.[0].length ?? 2;
  const endIndex = lines.findIndex((line, index) => {
    if (index <= headingIndex) return false;
    const match = line.match(/^(#{2,4})\s+/);
    return !!match && match[1].length <= headingLevel;
  });

  return lines.slice(headingIndex, endIndex === -1 ? undefined : endIndex).join("\n").trim();
};

export const excerptFor = (documentId: string, section: string, maxLength = 520) => {
  const sectionMarkdown = extractSection(getDocument(documentId).content, section);
  const text = stripMarkdown(sectionMarkdown);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
};

export const mediaItems: MediaFragment[] = [
  {
    id: "mf-unicol",
    source: "UNICOL Mission Desk",
    kind: "Observer Update",
    time: "09:25 IWST",
    documentId: "media-fragments",
    section: "3. UNICOL Incident Report Excerpt",
    body: excerptFor("media-fragments", "3. UNICOL Incident Report Excerpt", 260),
  },
  {
    id: "mf-exex",
    source: "EXEX Corporate Communications",
    kind: "Official Statement",
    time: "09:41 IWST",
    documentId: "media-fragments",
    section: "7. EXEX Press Briefing Excerpt",
    body: excerptFor("media-fragments", "7. EXEX Press Briefing Excerpt", 260),
  },
  {
    id: "mf-opsec",
    source: "Security Markets Weekly",
    kind: "Analyst Note",
    time: "10:13 IWST",
    documentId: "media-fragments",
    section: "10. OPSEC Talk Excerpt",
    body: excerptFor("media-fragments", "10. OPSEC Talk Excerpt", 260),
  },
  {
    id: "mf-market",
    source: "Hellas Capital Desk",
    kind: "Analyst Note",
    time: "10:34 IWST",
    documentId: "media-fragments",
    section: "13. Financial Analysis Excerpt",
    body: excerptFor("media-fragments", "13. Financial Analysis Excerpt", 260),
  },
  {
    id: "mf-psa",
    source: "PSA Licensing Office",
    kind: "Official Statement",
    time: "10:58 IWST",
    documentId: "media-fragments",
    section: "16. PSA Emergency Directive",
    body: excerptFor("media-fragments", "16. PSA Emergency Directive", 260),
  },
  {
    id: "mf-public",
    source: "Public Feed",
    kind: "Public Reaction",
    time: "11:06 IWST",
    documentId: "media-fragments",
    section: "6. Public Reaction Snippets",
    body: excerptFor("media-fragments", "6. Public Reaction Snippets", 220),
  },
];
