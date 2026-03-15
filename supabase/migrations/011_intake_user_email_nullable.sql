-- Allow intake without email so the voice agent can save location/consent first and add email when the user provides it
ALTER TABLE public.intakes
  ALTER COLUMN user_email DROP NOT NULL;
