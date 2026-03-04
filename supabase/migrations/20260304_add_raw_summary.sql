-- Migration to add raw_summary column to resources
alter table public.resources add column if not exists raw_summary text;

comment on column public.resources.raw_summary is 'Contiene il riassunto originale non elaborato da AI, o la descrizione completa del video.';
