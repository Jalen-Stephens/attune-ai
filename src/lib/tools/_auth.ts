/**
 * Validate X-VAPI-SECRET header against VAPI_SERVER_SECRET.
 * Returns 401 Response if invalid; otherwise returns null (caller proceeds).
 */

const DEBUG_AUTH = process.env.DEBUG_VAPI_AUTH === 'true';

function normalizeSecret(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^[,;\s]+/, '').trim();
  if (!trimmed) return null;
  const unquoted = trimmed.replace(/^["']|["']$/g, '');
  return unquoted.trim() || null;
}

export function validateVapiSecret(request: Request): Response | null {
  const rawSecret = request.headers.get('x-vapi-secret');
  const rawExpected = process.env.VAPI_SERVER_SECRET;
  const secret = normalizeSecret(rawSecret);
  const expected = normalizeSecret(rawExpected);

  if (DEBUG_AUTH) {
    console.log('[Vapi Auth Debug]', {
      headerSent: rawSecret ?? '(null)',
      envValue: rawExpected ?? '(null)',
      headerLength: rawSecret?.length ?? 0,
      envLength: rawExpected?.length ?? 0,
      match: secret === expected,
    });
  }

  if (!expected || expected.trim() === '') {
    if (DEBUG_AUTH) console.log('[Vapi Auth] FAIL: VAPI_SERVER_SECRET not set in env');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: VAPI_SERVER_SECRET not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!secret || secret !== expected) {
    if (DEBUG_AUTH) {
      console.log('[Vapi Auth] FAIL: 401 cause =', !secret ? 'header missing' : 'secret mismatch');
    }
    return new Response(
      JSON.stringify({
        error: 'Unauthorized: invalid or missing X-VAPI-SECRET',
        ...(DEBUG_AUTH && {
          _debug: !secret
            ? 'Header X-VAPI-SECRET was not sent. Add it to your request headers.'
            : 'X-VAPI-SECRET value does not match VAPI_SERVER_SECRET in .env',
        }),
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}
