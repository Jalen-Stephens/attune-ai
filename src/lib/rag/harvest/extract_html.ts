/**
 * HTML -> main content via @mozilla/readability + jsdom, then turndown -> markdown.
 * Reject if content too short.
 */

const MIN_CONTENT_LENGTH = 300;

export type ExtractHtmlResult = {
  title: string;
  html: string;
  markdown: string;
  textContent: string;
};

/**
 * Strip <style> and stylesheet <link> so jsdom doesn't try to parse CSS (avoids "Could not parse CSS stylesheet").
 */
function stripStyles(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]*\srel\s*=\s*["']stylesheet["'][^>]*>/gi, '');
}

/**
 * Extract article body from HTML and convert to markdown.
 */
export async function extractHtml(html: string, url: string): Promise<ExtractHtmlResult> {
  const { JSDOM } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');
  const TurndownService = (await import('turndown')).default;

  const htmlWithoutStyles = stripStyles(html);
  const dom = new JSDOM(htmlWithoutStyles, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error('Readability could not parse article');
  }

  const textContent = (article.textContent ?? '').trim();
  const htmlContent = article.content ?? '';

  if (textContent.length < MIN_CONTENT_LENGTH) {
    throw new Error(
      `Article content too short: ${textContent.length} chars (min ${MIN_CONTENT_LENGTH})`
    );
  }

  const turndown = new TurndownService({ headingStyle: 'atx' });
  const markdown = turndown.turndown(htmlContent || `<p>${textContent.replace(/\n/g, '</p><p>')}</p>`);

  return {
    title: (article.title ?? '').trim() || 'Untitled',
    html: htmlContent,
    markdown: markdown.trim(),
    textContent,
  };
}

export const MIN_HTML_CONTENT_LENGTH = MIN_CONTENT_LENGTH;
