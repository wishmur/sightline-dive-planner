-- Spend and abuse guard for the Claude-backed server functions (understandTrip,
-- askDestination). See src/lib/llm-guard.ts; evals/llm-guard.test.ts runs this
-- file in embedded Postgres against the same contract as the in-memory store.
--
-- Counters only: a UUID session id from the browser, a keyed daily hash of the
-- client address (never the address), and site-wide totals. No request text.
-- Only the server (service_role) can read, write or call any of it.

CREATE TABLE public.llm_quota (
  bucket text PRIMARY KEY,          -- global:<day> | session:<uuid>:<hour> | ip:<hash>:<day>
  calls integer NOT NULL DEFAULT 0,
  usd numeric(12, 6) NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.llm_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.llm_quota FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.llm_quota TO service_role;

-- Returns 'ok' (the call is counted and its worst-case cost reserved) or the
-- first limit it would break: daily_calls, daily_spend, session_limit, ip_limit.
-- A denied call counts nothing.
CREATE OR REPLACE FUNCTION public.llm_reserve(
  p_day date,
  p_hour text,
  p_session text,
  p_ip text,
  p_usd numeric,
  p_session_limit integer,
  p_ip_limit integer,
  p_daily_calls integer,
  p_daily_usd numeric
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k_global text := 'global:' || p_day;
  k_session text := 'session:' || p_session || ':' || p_hour;
  k_ip text := 'ip:' || p_ip || ':' || p_day;
  g_calls integer;
  g_usd numeric;
  s_calls integer;
  i_calls integer;
BEGIN
  INSERT INTO llm_quota (bucket, expires_at) VALUES
    (k_global, p_day + 3),
    (k_session, p_day + 2),
    (k_ip, p_day + 2)
  ON CONFLICT (bucket) DO NOTHING;

  -- Locking the day's global row serialises reservations, so concurrent calls
  -- can't overshoot the call or spend cap.
  SELECT calls, usd INTO g_calls, g_usd FROM llm_quota WHERE bucket = k_global FOR UPDATE;
  IF g_calls >= p_daily_calls THEN RETURN 'daily_calls'; END IF;
  IF g_usd + p_usd > p_daily_usd THEN RETURN 'daily_spend'; END IF;

  SELECT calls INTO s_calls FROM llm_quota WHERE bucket = k_session;
  IF s_calls >= p_session_limit THEN RETURN 'session_limit'; END IF;

  SELECT calls INTO i_calls FROM llm_quota WHERE bucket = k_ip;
  IF i_calls >= p_ip_limit THEN RETURN 'ip_limit'; END IF;

  UPDATE llm_quota SET calls = calls + 1, usd = usd + p_usd WHERE bucket = k_global;
  UPDATE llm_quota SET calls = calls + 1 WHERE bucket IN (k_session, k_ip);

  -- Occasional housekeeping; rows are only needed for a day or two.
  IF random() < 0.01 THEN
    DELETE FROM llm_quota WHERE expires_at < now();
  END IF;

  RETURN 'ok';
END;
$$;

-- After the call: move the day's spend by (actual cost − reserved), never below 0.
CREATE OR REPLACE FUNCTION public.llm_settle(p_day date, p_delta numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE llm_quota SET usd = greatest(0, usd + p_delta) WHERE bucket = 'global:' || p_day;
$$;

REVOKE ALL ON FUNCTION public.llm_reserve(date, text, text, text, numeric, integer, integer, integer, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.llm_settle(date, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.llm_reserve(date, text, text, text, numeric, integer, integer, integer, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.llm_settle(date, numeric) TO service_role;
