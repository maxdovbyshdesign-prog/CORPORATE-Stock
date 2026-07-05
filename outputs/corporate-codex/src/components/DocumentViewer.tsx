import type { CodexDocument, CodexDocumentId } from "../data/documents";
import { extractSection } from "../data/documents";
import { loreAtoms, loreAtomStats } from "../lib/codexExtractor";

type DocumentViewerProps = {
  documents: CodexDocument[];
  selectedDocumentId: CodexDocumentId;
  selectedSection?: string;
  onSelectDocument: (documentId: CodexDocumentId) => void;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] };

const inlineFormat = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");

const toBlocks = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: inlineFormat(paragraph.join(" ")) });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list.map(inlineFormat) });
      list = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: inlineFormat(heading[2]) });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: inlineFormat(trimmed.replace(/^>\s?/, "")) });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
};

export function DocumentViewer({
  documents,
  selectedDocumentId,
  selectedSection,
  onSelectDocument,
}: DocumentViewerProps) {
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? documents[0];
  const markdown = selectedSection ? extractSection(selectedDocument.content, selectedSection) : selectedDocument.content;
  const blocks = toBlocks(markdown);

  return (
    <section className="codex-view" aria-label="Codex documents">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local Markdown Source</p>
          <h2>Codex Documents</h2>
        </div>
        <span>CONTENT/CORPORATE</span>
      </div>

      <div className="codex-layout">
        <aside className="document-index" aria-label="Document index">
          {documents.map((document) => (
            <button
              key={document.id}
              className={document.id === selectedDocument.id ? "active" : ""}
              onClick={() => onSelectDocument(document.id)}
            >
              <strong>{document.title}</strong>
              <span>{document.category}</span>
              <small>{document.filename}</small>
            </button>
          ))}

          <div className="codex-atom-panel">
            <p className="eyebrow">Codex Atoms</p>
            <strong>{loreAtoms.length}</strong>
            <dl>
              {Object.entries(loreAtomStats).map(([kind, count]) => (
                <div key={kind}>
                  <dt>{kind.replace("_", " ")}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <article className="markdown-document">
          <header>
            <p className="eyebrow">{selectedDocument.category}</p>
            <h2>{selectedSection ?? selectedDocument.title}</h2>
            <p>{selectedSection ? selectedDocument.filename : selectedDocument.summary}</p>
          </header>

          <div className="markdown-body">
            {blocks.map((block, index) => {
              if (block.type === "heading") {
                const HeadingTag = `h${Math.min(block.level + 1, 4)}` as "h2" | "h3" | "h4";
                return <HeadingTag key={`${block.text}-${index}`}>{block.text}</HeadingTag>;
              }

              if (block.type === "quote") {
                return <blockquote key={`${block.text}-${index}`}>{block.text}</blockquote>;
              }

              if (block.type === "list") {
                return (
                  <ul key={`list-${index}`}>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }

              return <p key={`${block.text}-${index}`}>{block.text}</p>;
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
