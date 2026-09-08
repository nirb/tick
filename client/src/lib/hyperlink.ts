export type HyperlinkToken =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; url: string };

/**
 * Parses a string into plain text and link tokens.
 * Supports:
 * - Markdown links: [Label](https://example.com)
 * - Raw URLs: https://..., http://..., www....
 * - Email addresses: name@domain.com
 *
 * Handles trailing punctuation and balanced parentheses for Wikipedia-style URLs.
 */
export function parseHyperlinkText(text: string | null | undefined): HyperlinkToken[] {
  if (!text) return [];

  const LINK_REGEX =
    /(\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\))|((?:https?:\/\/[a-zA-Z0-9]|www\.[a-zA-Z0-9])[^\s<]*)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  const tokens: HyperlinkToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Markdown link: [label](url)
      const label = match[2];
      const rawUrl = match[3];
      const url = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
      tokens.push({ type: 'link', label, url });
      lastIndex = LINK_REGEX.lastIndex;
    } else if (match[4]) {
      // Plain URL - may have trailing punctuation to trim
      let rawUrl = match[4];
      let trailing = '';

      while (rawUrl.length > 0) {
        const lastChar = rawUrl[rawUrl.length - 1];
        if (/[.,:;!?\x27"״׳]/.test(lastChar)) {
          trailing = lastChar + trailing;
          rawUrl = rawUrl.slice(0, -1);
        } else if (lastChar === ')') {
          const openCount = (rawUrl.match(/\(/g) || []).length;
          const closeCount = (rawUrl.match(/\)/g) || []).length;
          if (closeCount > openCount) {
            trailing = lastChar + trailing;
            rawUrl = rawUrl.slice(0, -1);
          } else {
            break;
          }
        } else if (lastChar === ']') {
          const openCount = (rawUrl.match(/\[/g) || []).length;
          const closeCount = (rawUrl.match(/\]/g) || []).length;
          if (closeCount > openCount) {
            trailing = lastChar + trailing;
            rawUrl = rawUrl.slice(0, -1);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (rawUrl.length > 0) {
        const url = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
        tokens.push({
          type: 'link',
          label: rawUrl,
          url,
        });
      }

      if (trailing) {
        tokens.push({ type: 'text', text: trailing });
      }

      lastIndex = match.index + match[4].length;
    } else if (match[5]) {
      // Email address
      const email = match[5];
      tokens.push({
        type: 'link',
        label: email,
        url: `mailto:${email}`,
      });
      lastIndex = LINK_REGEX.lastIndex;
    }
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}
