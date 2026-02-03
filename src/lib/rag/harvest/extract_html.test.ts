import { describe, it, expect } from 'vitest';
import { extractHtml, MIN_HTML_CONTENT_LENGTH } from './extract_html';

describe('extractHtml', () => {
  it('extracts main content and markdown from simple article HTML', async () => {
    const html = `
      <html><head><title>Test Article Title</title></head><body>
        <article>
          <h1>Test Article Title</h1>
          <p>This is the first paragraph with enough content to pass the minimum length.
          We need at least ${MIN_HTML_CONTENT_LENGTH} characters of text content.
          Adding more text here to ensure we exceed the threshold for the test.
          Here is some extra filler content to push the character count over three hundred.</p>
          <p>Second paragraph with additional content for the body.</p>
        </article>
      </body></html>
    `;
    const result = await extractHtml(html, 'https://example.com/page');
    expect(result.title).toBeTruthy();
    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.textContent.length).toBeGreaterThanOrEqual(MIN_HTML_CONTENT_LENGTH);
  });

  it('rejects when content too short', async () => {
    const html = '<html><body><p>Short.</p></body></html>';
    await expect(extractHtml(html, 'https://example.com')).rejects.toThrow(/too short/);
  });

  it('exports MIN_HTML_CONTENT_LENGTH', () => {
    expect(MIN_HTML_CONTENT_LENGTH).toBe(300);
  });
});
