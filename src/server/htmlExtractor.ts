export interface ExtractedPage {
  title?: string;
  description?: string;
  textContent: string;
  byteLength: number;
}

export function extractTextFromHtml(html: string, maxCharacters = 3500): ExtractedPage {
  // Extract Title
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

  // Extract Meta Description
  const descMatch = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
                    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i.exec(html);
  const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : undefined;

  // Clean HTML: Remove comments
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, ' ');

  // Remove non-content tags: script, style, noscript, svg, nav, footer, header, form
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  cleaned = cleaned.replace(/<form[\s\S]*?<\/form>/gi, ' ');

  // Insert spacing around block-level elements
  cleaned = cleaned.replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
  cleaned = cleaned.replace(/<br[^>]*>/gi, '\n');

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned);

  // Normalize whitespace: collapse multiple spaces and blank lines
  const lines = cleaned
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 20); // Filter out tiny UI artifacts / menu items

  let textContent = lines.join('\n\n').trim();

  // Bounded length restriction
  if (textContent.length > maxCharacters) {
    textContent = textContent.slice(0, maxCharacters).trim() + '...';
  }

  return {
    title,
    description,
    textContent,
    byteLength: Buffer.byteLength(html, 'utf8'),
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}
