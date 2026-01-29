/**
 * Runtime validation for Vapi Web SDK env vars (client-side only).
 * Use NEXT_PUBLIC_VAPI_* only. Never use private keys on the client.
 * @throws In development if required vars are missing.
 */
export function validateVapiEnv(): {
  publicKey: string;
  assistantId: string;
} {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? '';
  const isDev = process.env.NODE_ENV === 'development';

  if (!publicKey || !assistantId) {
    const msg =
      'Missing Vapi Web SDK env: set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env. See docs/VAPI_WEB_SDK.md.';
    if (isDev) throw new Error(msg);
    return { publicKey: '', assistantId: '' };
  }

  return { publicKey, assistantId };
}
