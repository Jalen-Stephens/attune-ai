import { describe, it, expect } from 'vitest';
import { contentHash } from './dedupe';

describe('contentHash', () => {
  it('returns same hash for same text', () => {
    const text = 'Hello world. This is the same content.';
    expect(contentHash(text)).toBe(contentHash(text));
  });

  it('returns different hash for different text', () => {
    const a = 'Content A';
    const b = 'Content B';
    expect(contentHash(a)).not.toBe(contentHash(b));
  });

  it('normalizes whitespace: same hash for trim + collapse spaces', () => {
    const a = '  hello   world  ';
    const b = 'hello world';
    expect(contentHash(a)).toBe(contentHash(b));
  });

  it('normalizes line endings: same hash for \\n vs \\r\\n', () => {
    const a = 'line1\nline2';
    const b = 'line1\r\nline2';
    expect(contentHash(a)).toBe(contentHash(b));
  });

  it('returns 64-char hex string', () => {
    const hash = contentHash('any');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
