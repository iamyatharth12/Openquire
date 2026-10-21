import React from 'react';

interface MarkdownAnswerRendererProps {
  content: string;
  onCitationClick: (sourceId: number) => void;
  validSourceIds: number[];
  highlightedCitationId?: number | null;
}

/**
 * Sanitized, safe Markdown renderer for grounded research answers.
 * Parses headings, lists, tables, code blocks, bold/italics, and links
 * while mapping inline bracketed citations [1], [2] to interactive source cards.
 * Never executes raw model HTML.
 */
export const MarkdownAnswerRenderer: React.FC<MarkdownAnswerRendererProps> = ({
  content,
  onCitationClick,
  validSourceIds,
  highlightedCitationId,
}) => {
  if (!content) return null;

  // Split into block elements by double newlines or block-level markers
  const rawBlocks = content.split(/\n\n+/);

  const renderInline = (text: string): React.ReactNode[] => {
    // Regular expression matching:
    // 1. Citations: [1], [2]
    // 2. Bold: **text**
    // 3. Italic: *text*
    // 4. Inline code: `code`
    // 5. Links: [label](url)
    const tokenRegex = /(\[\d+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\((?:https?:\/\/[^\s)]+)\))/g;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      // Push preceding plain text
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const [fullMatch, citation, bold, italic, code, link] = match;

      if (citation) {
        const idMatch = citation.match(/\[(\d+)\]/);
        const sourceId = idMatch ? parseInt(idMatch[1], 10) : 0;
        const isValid = validSourceIds.includes(sourceId);
        const isHighlighted = highlightedCitationId === sourceId;

        if (isValid) {
          nodes.push(
            <button
              key={`cite-${sourceId}-${match.index}`}
              type="button"
              onClick={() => onCitationClick(sourceId)}
              className={`inline-flex items-center justify-center align-baseline mx-0.5 px-1.5 py-0.2 rounded-full font-mono text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                isHighlighted
                  ? 'bg-[#102000] text-[#B8F36B] ring-2 ring-[#B8F36B] scale-110'
                  : 'bg-[#B8F36B] text-[#102000] hover:bg-[#A7EB50] hover:scale-105 active:scale-95'
              }`}
              title={`View Evidence Source #${sourceId}`}
            >
              {sourceId}
            </button>
          );
        } else {
          nodes.push(
            <span
              key={`cite-unknown-${sourceId}-${match.index}`}
              className="inline-flex items-center justify-center align-baseline mx-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono font-bold"
              title={`Source #${sourceId} was cited by model but is missing from retrieved evidence`}
            >
              [{sourceId}?]
            </span>
          );
        }
      } else if (bold) {
        const inner = bold.slice(2, -2);
        nodes.push(
          <strong key={`bold-${match.index}`} className="font-semibold text-[#191919]">
            {inner}
          </strong>
        );
      } else if (italic) {
        const inner = italic.slice(1, -1);
        nodes.push(
          <em key={`italic-${match.index}`} className="italic text-[#2C3E50]">
            {inner}
          </em>
        );
      } else if (code) {
        const inner = code.slice(1, -1);
        nodes.push(
          <code
            key={`code-${match.index}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#F1F2ED] text-[#191919] font-mono text-xs border border-[#E8E8E5]"
          >
            {inner}
          </code>
        );
      } else if (link) {
        const linkMatch = link.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          nodes.push(
            <a
              key={`link-${match.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#416900] underline font-medium hover:text-[#191919] transition-colors"
            >
              {label}
            </a>
          );
        } else {
          nodes.push(link);
        }
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  const renderBlock = (block: string, blockIdx: number) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Fenced Code Block: ```lang\ncode\n```
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const codeContent = lines.slice(1, lines[lines.length - 1].startsWith('```') ? -1 : undefined).join('\n');
      return (
        <div key={blockIdx} className="my-3 rounded-xl overflow-hidden border border-[#E8E8E5] bg-[#191919] text-[#FAFAF8]">
          {lang && (
            <div className="px-3 py-1 bg-[#2C2C2C] text-[10px] font-mono uppercase text-[#DFE0DC] border-b border-[#3D3D3D]">
              {lang}
            </div>
          )}
          <pre className="p-3 font-mono text-xs overflow-x-auto leading-relaxed">
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    // Markdown Table: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
      const rows = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
      if (rows.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseRow(rows[0]);
        // Filter out separator row e.g. |---|---|
        const bodyRows = rows.slice(1).filter((r) => !r.includes('---'));

        return (
          <div key={blockIdx} className="overflow-x-auto my-3 rounded-xl border border-[#E8E8E5]">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-[#F6F3F2] border-b border-[#E8E8E5]">
                  {headers.map((h, i) => (
                    <th key={i} className="p-2.5 font-semibold text-[#191919]">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]">
                {bodyRows.map((r, rIdx) => {
                  const cells = parseRow(r);
                  return (
                    <tr key={rIdx} className="hover:bg-[#FAFAF8] transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-[#434938]">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Headings: #, ##, ###, ####
    if (trimmed.startsWith('#### ')) {
      return (
        <h4 key={blockIdx} className="text-sm sm:text-base font-semibold text-[#191919] mt-4 mb-2 tracking-tight">
          {renderInline(trimmed.replace(/^####\s+/, ''))}
        </h4>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={blockIdx} className="text-base sm:text-lg font-semibold text-[#191919] mt-5 mb-2 tracking-tight">
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={blockIdx} className="text-lg sm:text-xl font-bold text-[#191919] mt-6 mb-2.5 tracking-tight border-b border-[#E8E8E5]/60 pb-1">
          {renderInline(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={blockIdx} className="text-xl sm:text-2xl font-bold text-[#191919] mt-6 mb-3 tracking-tight">
          {renderInline(trimmed.replace(/^#\s+/, ''))}
        </h1>
      );
    }

    // Blockquote: > text
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed
        .split('\n')
        .map((l) => l.replace(/^>\s*/, ''))
        .join(' ');
      return (
        <blockquote
          key={blockIdx}
          className="border-l-4 border-[#B8F36B] pl-3 py-1.5 my-3 bg-[#F6F3F2] rounded-r-xl text-xs sm:text-sm italic text-[#434938]"
        >
          {renderInline(quoteText)}
        </blockquote>
      );
    }

    // Lists: Unordered (- or *) or Ordered (1. 2.)
    const lines = trimmed.split('\n');
    const isUnordered = lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOrdered = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (isUnordered) {
      return (
        <ul key={blockIdx} className="space-y-1.5 my-3 pl-5 list-disc text-xs sm:text-sm text-[#191919] marker:text-[#416900]">
          {lines.map((l, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(l.replace(/^\s*[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      );
    }

    if (isOrdered) {
      return (
        <ol key={blockIdx} className="space-y-1.5 my-3 pl-5 list-decimal text-xs sm:text-sm text-[#191919] marker:font-mono marker:font-bold marker:text-[#416900]">
          {lines.map((l, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(l.replace(/^\s*\d+\.\s+/, ''))}
            </li>
          ))}
        </ol>
      );
    }

    // Standard Paragraph (preserves single line breaks within paragraph)
    return (
      <p key={blockIdx} className="text-sm sm:text-base text-[#191919] leading-relaxed mb-3 break-words">
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {renderInline(line)}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  };

  return <div className="space-y-1 leading-relaxed text-[#191919] break-words min-w-0 w-full">{rawBlocks.map(renderBlock)}</div>;
};
