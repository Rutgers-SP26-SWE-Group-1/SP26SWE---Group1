export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapDuckDuckGoUrl(value: string) {
  try {
    const decoded = decodeHtml(value);
    const url = new URL(decoded, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : decoded;
  } catch {
    return decodeHtml(value);
  }
}

export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'ScarletAI/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];
    const resultPattern =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    for (const match of html.matchAll(resultPattern)) {
      const title = decodeHtml(match[2]);
      const resultUrl = unwrapDuckDuckGoUrl(match[1]);
      const snippet = decodeHtml(match[3]);

      if (title && resultUrl) {
        results.push({ title, url: resultUrl, snippet });
      }

      if (results.length >= 5) {
        break;
      }
    }

    return results;
  } catch {
    return [];
  }
}
