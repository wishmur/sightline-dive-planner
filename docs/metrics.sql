-- Sightline product metrics. Run in the Supabase SQL editor (service role):
-- the public anon key can insert events but cannot read them.
--
-- Each query answers one product question. None of them is a correctness label:
-- a thumbs-up measures satisfaction, and divers rate optimistic answers higher
-- (a correct "mantas are unlikely in July" can get a thumbs-down). Correctness
-- comes from source verification and the eval suite, not from these numbers.

-- 1. Do people use the brief at all? Share of sessions that set month, animals,
--    certification or current (the fit engine only engages then).
select
  count(distinct session_id) filter (where event_type = 'fit_results')::float
    / nullif(count(distinct session_id), 0) as share_of_sessions_with_a_brief
from events
where created_at > now() - interval '30 days';

-- 2. How often does a brief come back empty, and does "Close, but…" rescue it?
select
  count(*) filter (where jsonb_array_length(payload->'results') = 0) as empty_results,
  count(*) filter (where jsonb_array_length(payload->'results') = 0
                     and jsonb_array_length(payload->'near_misses') > 0) as empty_but_near_misses_shown,
  count(*) as briefs
from events
where event_type = 'fit_results' and created_at > now() - interval '30 days';

-- 3. Do near misses get clicked? (They exist to replace the dead end.)
select
  count(*) filter (where payload->>'from' = 'near_miss') as near_miss_clicks,
  count(*) as destination_views
from events
where event_type = 'view_destination' and created_at > now() - interval '30 days';

-- 4. Is the "For your trip" panel useful? By fit tier, so a drop in one tier
--    (e.g. near misses) is visible rather than averaged away.
select
  payload->>'tier' as tier,
  count(*) filter (where (payload->>'helpful')::boolean) as helpful,
  count(*) filter (where not (payload->>'helpful')::boolean) as something_off,
  count(*) as answers
from events
where event_type = 'fit_feedback' and created_at > now() - interval '90 days'
group by 1 order by answers desc;

-- 5. Does anyone look at the evidence? Opens of a source check, by what it said.
select payload->>'status' as status, count(*) as opens
from events
where event_type = 'verification_open' and created_at > now() - interval '90 days'
group by 1 order by opens desc;

-- 6. Qualified shortlist rate (primary success metric): sessions with a brief that
--    opened at least one "For your trip" panel AND followed the evidence (a
--    source link, a source check, a concern's evidence, or an operator link;
--    operator links log click_source since 2026-09-22, and concern evidence was
--    added here to match query 12). For an experiment, divide by exposed
--    sessions instead: see docs/experiment-describe.md.
with s as (
  select session_id,
         bool_or(event_type = 'fit_results') as briefed,
         bool_or(event_type = 'fit_panel_view') as panel,
         bool_or(event_type in ('click_source', 'verification_open', 'concern_evidence_open')) as evidence
  from events
  where created_at > now() - interval '30 days'
  group by session_id
)
select count(*) filter (where briefed and panel and evidence)::float
         / nullif(count(*) filter (where briefed), 0) as qualified_shortlist_rate
from s;

-- 7. Where "Something's off" lands: the correction queue. Each row starts a
--    triage (retrieve the claim's sources → review → corrections.json → evals).
select created_at, destination_id, kind, message
from feedback
where created_at > now() - interval '30 days'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- Plain-language planning (added 2026-09-21). The raw text people type is never
-- logged; these events carry only what was understood.

-- 8. Does "Describe your trip" get used, and does it understand people? An empty
--    parse means the diver wrote something and nothing changed.
select
  payload->>'engine' as engine,
  count(*) as descriptions,
  count(*) filter (where (payload->>'empty')::boolean) as understood_nothing,
  avg(jsonb_array_length(payload->'fields')) as fields_set
from events
where event_type = 'trip_described' and created_at > now() - interval '30 days'
group by 1;

-- 9. What's on divers' minds? Concerns raised (typed or toggled). This is the
--    curation queue: a concern raised often and "not covered" often is data work.
select concern, count(*) as raised
from events, jsonb_array_elements_text(payload->'concerns') as concern
where event_type = 'trip_described' and created_at > now() - interval '90 days'
group by 1 order by raised desc;

-- 10. What do people ask for that Sightline can't answer? (Roadmap, not a bug list.)
select ask, count(*) as times
from events, jsonb_array_elements_text(payload->'unsupported') as ask
where event_type = 'trip_described' and created_at > now() - interval '90 days'
group by 1 order by times desc;

-- 11. Ask about this destination: how often is the answer "the record doesn't
--     say", by engine and destination? High not_covered on one record = a gap.
select payload->>'destination' as destination,
       payload->>'engine' as engine,
       count(*) filter (where payload->>'status' = 'not_covered') as not_covered,
       count(*) as questions
from events
where event_type = 'ask_question' and created_at > now() - interval '90 days'
group by 1, 2 order by questions desc;

-- 12. Does comparing help people decide? Qualified shortlist rate for sessions
--     that opened a comparison vs those that didn't.
with s as (
  select session_id,
         bool_or(event_type = 'compare_open') as compared,
         bool_or(event_type = 'fit_results') as briefed,
         bool_or(event_type = 'fit_panel_view') as panel,
         bool_or(event_type in ('click_source', 'verification_open', 'concern_evidence_open')) as evidence
  from events
  where created_at > now() - interval '30 days'
  group by session_id
)
select compared,
       count(*) filter (where briefed and panel and evidence)::float
         / nullif(count(*) filter (where briefed), 0) as qualified_shortlist_rate,
       count(*) filter (where briefed) as briefed_sessions
from s group by 1;

-- ---------------------------------------------------------------------------
-- Claude operations (added 2026-09-21). One 'llm_call' event per request to
-- understandTrip / askDestination, written server-side (src/lib/llm-route.ts):
-- engine, reason rules answered, prompt version, model, latency, tokens, cost.
-- Never the diver's text; `chars` is its length.

-- 13. Who answered, and why rules did. no_key = Claude not configured;
--     kill_switch / *_limit / daily_* = the guard; the rest are failures.
select
  payload->>'route' as route,
  payload->>'engine' as engine,
  coalesce(payload->>'reason', '-') as reason,
  count(*) as calls
from events
where event_type = 'llm_call' and created_at > now() - interval '7 days'
group by 1, 2, 3
order by 1, 4 desc;

-- 14. Latency and cost per answered call, by route and prompt version.
--     A new prompt version shows up as a new row, so a regression is visible.
select
  payload->>'route' as route,
  payload->>'prompt_version' as prompt_version,
  count(*) as calls,
  percentile_cont(0.5) within group (order by (payload->>'latency_ms')::int) as p50_ms,
  percentile_cont(0.95) within group (order by (payload->>'latency_ms')::int) as p95_ms,
  avg((payload->>'input_tokens')::int) as avg_input_tokens,
  avg((payload->>'cache_read_tokens')::int) as avg_cache_read_tokens,
  avg((payload->>'output_tokens')::int) as avg_output_tokens,
  avg((payload->>'usd')::numeric) as avg_usd
from events
where event_type = 'llm_call' and payload->>'engine' = 'claude'
  and created_at > now() - interval '7 days'
group by 1, 2
order by 1, 2;

-- 15. Spend per day against the cap (SIGHTLINE_LLM_DAILY_USD, default $5), and
--     the share of calls the guard turned away. Cross-check with llm_quota.
select
  date_trunc('day', created_at) as day,
  sum((payload->>'usd')::numeric) as usd,
  count(*) filter (where payload->>'reason' in
    ('session_limit', 'ip_limit', 'daily_calls', 'daily_spend')) as guarded,
  count(*) filter (where (payload->>'attempted')::boolean) as claude_requests
from events
where event_type = 'llm_call' and created_at > now() - interval '30 days'
group by 1
order by 1 desc;

-- 16. Output the product had to discard: out-of-list IDs dropped by
--     normalizeTrip(), sentence numbers rejected by the ask gate.
select
  payload->>'route' as route,
  sum(coalesce((payload->'counts'->>'dropped')::int, 0)) as dropped_values,
  sum(coalesce((payload->'counts'->>'rejected')::int, 0)) as rejected_sentences,
  count(*) as answered_calls
from events
where event_type = 'llm_call' and payload->>'engine' = 'claude'
  and created_at > now() - interval '30 days'
group by 1;

-- ---------------------------------------------------------------------------
-- Experiment readout (added 2026-09-22): "Describe your trip" vs filters only.
-- Plan, sample size and guardrails: docs/experiment-describe.md. Assignment is
-- logged as 'experiment_exposure' {experiment, arm}; sessions that saw both
-- arms are dropped (and counted in 18).

-- 17. Primary metric and guardrails by arm. The denominator is EXPOSED sessions,
--     not briefed ones: the treatment itself changes who makes a brief.
with exposure as (
  select session_id, min(payload->>'arm') as arm, count(distinct payload->>'arm') as arms
  from events
  where event_type = 'experiment_exposure' and payload->>'experiment' = 'describe-v1'
  group by session_id
), s as (
  select e.session_id, x.arm,
         bool_or(e.event_type = 'fit_results') as briefed,
         bool_or(e.event_type = 'fit_panel_view') as panel,
         bool_or(e.event_type in ('click_source', 'verification_open', 'concern_evidence_open')) as evidence,
         bool_or(e.event_type = 'fit_results' and jsonb_array_length(e.payload->'results') = 0) as empty_result,
         bool_or(e.event_type = 'fit_feedback' and not (e.payload->>'helpful')::boolean) as something_off
  from events e join exposure x using (session_id)
  where x.arms = 1
  group by e.session_id, x.arm
)
select arm,
       count(*) as exposed_sessions,
       avg((briefed and panel and evidence)::int) as qualified_shortlist_rate,
       avg(briefed::int) as brief_rate,
       avg(empty_result::int) filter (where briefed) as empty_result_rate,
       avg(something_off::int) as something_off_rate
from s group by arm order by arm;

-- 18. Sample-ratio check: exposed sessions per arm (expect 50/50), and sessions
--     that saw both arms (should be ~0; assignment is per visitor).
select payload->>'arm' as arm, count(distinct session_id) as sessions
from events
where event_type = 'experiment_exposure' and payload->>'experiment' = 'describe-v1'
group by 1
union all
select 'both', count(*) from (
  select session_id from events
  where event_type = 'experiment_exposure' and payload->>'experiment' = 'describe-v1'
  group by session_id having count(distinct payload->>'arm') > 1
) x;

-- ---------------------------------------------------------------------------
-- Inbox (added 2026-09-23). The feedback form and the "Suggest an operator"
-- form both write to tables that have an INSERT policy for anon and no SELECT
-- policy at all, and nothing emails anyone. That is the right default for
-- privacy, but it means submissions are write-only: they are only ever seen if
-- someone runs these. Run them when you run 13-16.

-- 19. Unread feedback: corrections, destination requests, feature ideas.
--     `email` is only present when the sender chose to leave one; treat it as
--     personal data and don't paste it anywhere public.
select
  created_at,
  kind,
  coalesce(destination_id, '-') as destination,
  case when email is null then 'no reply address' else 'reply requested' end as reply,
  message
from feedback
order by created_at desc
limit 100;

-- 20. Operator suggestions waiting on review. The public read policy only
--     exposes status = 'published', so a pending row is invisible on the site
--     until it is promoted by hand.
select created_at, destination_id, name, website, blurb, email
from operators
where status = 'pending'
order by created_at desc;
