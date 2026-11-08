-- Vietnamese lexical retrieval is executed in PostgreSQL rather than by
-- loading a fixed subset of chunks into Node. `unaccent` makes queries with
-- and without Vietnamese diacritics comparable; `simple` avoids applying an
-- English stemmer to Vietnamese terms.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, value)
$$;
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_lexical_fts_idx"
  ON "knowledge_chunks"
  USING gin (to_tsvector('simple', public.immutable_unaccent(lower("content"))));
