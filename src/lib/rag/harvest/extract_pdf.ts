/**
 * PDF -> text via pdf-parse. Reject if too short or low alpha ratio (garbage).
 */

const MIN_TEXT_LENGTH = 200;
const MIN_ALPHA_RATIO = 0.3;

function alphaRatio(text: string): number {
  if (text.length === 0) return 0;
  let alpha = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) alpha += 1;
  }
  return alpha / text.length;
}

export type ExtractPdfResult = { text: string; numPages?: number };

/**
 * Extract text from PDF buffer. Throws if extraction fails or quality checks fail.
 * Suppresses pdf-parse "TT: undefined function" font warnings to keep logs clean.
 */
export async function extractPdf(buffer: Buffer): Promise<ExtractPdfResult> {
  const pdfParse = (await import('pdf-parse')).default;
  const noop = () => {};
  const stderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = noop as typeof process.stderr.write;
  let data: { text?: string; numpages?: number };
  try {
    data = await pdfParse(buffer);
  } finally {
    process.stderr.write = stderrWrite;
  }
  const text = (data?.text ?? '').trim();
  const numPages = data?.numpages as number | undefined;

  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(`PDF text too short: ${text.length} chars (min ${MIN_TEXT_LENGTH})`);
  }
  const ratio = alphaRatio(text);
  if (ratio < MIN_ALPHA_RATIO) {
    throw new Error(`PDF alpha ratio too low: ${ratio.toFixed(2)} (min ${MIN_ALPHA_RATIO})`);
  }
  return { text, numPages };
}

export const MIN_PDF_TEXT_LENGTH = MIN_TEXT_LENGTH;
export const MIN_PDF_ALPHA_RATIO = MIN_ALPHA_RATIO;
