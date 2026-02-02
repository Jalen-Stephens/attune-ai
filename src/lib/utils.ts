import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize unknown payloads to display-safe text. Prevents "[object Object]"
 * when API or Vapi returns objects in transcript/error fields.
 */
export function toDisplayText(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    if (payload === '[object Object]') return null;
    return payload;
  }

  if (typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    const candidates = [o.message, o.error, o.text, o.transcript].filter(
      (v): v is string => typeof v === 'string' && v !== '[object Object]'
    );
    return candidates[0] ?? null;
  }

  const s = String(payload);
  return s === '[object Object]' ? null : s;
}

/** True when the error is a normal call end (e.g. "Meeting ended due to ejection"). */
export function isCallEndedNoise(err: unknown): boolean {
  const msg =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err && typeof err === 'object' && 'error' in err && typeof (err as { error: unknown }).error === 'object'
            ? String((err as { error: { message?: string } }).error?.message ?? '')
            : '';
  return /Meeting ended due to ejection|Meeting has ended|ejection|due to ejection|call ended/i.test(msg);
}
