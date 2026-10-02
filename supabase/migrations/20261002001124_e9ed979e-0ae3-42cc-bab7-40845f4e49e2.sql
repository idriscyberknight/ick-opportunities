ALTER TABLE public.opportunities
  ADD COLUMN nigeria_score smallint CHECK (nigeria_score BETWEEN 0 AND 100),
  ADD COLUMN africa_score smallint CHECK (africa_score BETWEEN 0 AND 100),
  ADD COLUMN remote_score smallint CHECK (remote_score BETWEEN 0 AND 100),
  ADD COLUMN global_score smallint CHECK (global_score BETWEEN 0 AND 100),
  ADD COLUMN relevance_score smallint CHECK (relevance_score BETWEEN 0 AND 100);
CREATE INDEX opportunities_relevance_idx ON public.opportunities (relevance_score DESC NULLS LAST);