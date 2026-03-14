-- Google Places migration: add place_id, make zocdoc_url nullable.
-- Referrals can now come from Google Places API; booking_url is the single link (website or Maps URL).

-- Add Google Place ID when provider is from Places API
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Allow zocdoc_url to be null (legacy; new referrals use booking_url only)
ALTER TABLE public.referrals
  ALTER COLUMN zocdoc_url DROP NOT NULL;

COMMENT ON COLUMN public.referrals.place_id IS 'Google Place ID when provider is from Places API';
COMMENT ON COLUMN public.referrals.zocdoc_url IS 'Legacy Zocdoc URL; nullable after Google Places migration. Use booking_url.';
