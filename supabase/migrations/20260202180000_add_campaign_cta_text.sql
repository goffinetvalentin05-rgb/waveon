-- Add optional custom CTA text fields to campaigns.
-- If filled, they override the default text based on objective.

alter table public.campaigns
  add column if not exists cta_description text,
  add column if not exists cta_button_label text;
