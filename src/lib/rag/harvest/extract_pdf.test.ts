import { describe, it, expect } from 'vitest';
import { extractPdf, MIN_PDF_TEXT_LENGTH, MIN_PDF_ALPHA_RATIO } from './extract_pdf';

describe('extractPdf', () => {
  it('rejects invalid or empty PDF buffer', async () => {
    const notPdf = Buffer.from('not a pdf', 'utf-8');
    await expect(extractPdf(notPdf)).rejects.toThrow();
  });

  it('exports MIN_PDF_TEXT_LENGTH and MIN_PDF_ALPHA_RATIO', () => {
    expect(MIN_PDF_TEXT_LENGTH).toBe(200);
    expect(MIN_PDF_ALPHA_RATIO).toBe(0.3);
  });
});
