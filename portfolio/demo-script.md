# Demo script (about 2 min 45 s)

Record on the live site once this branch is merged, or on `bun run dev` before that. The
flow below was checked against the engine on 2026-09-22 with keyword rules reading the text
(no API key). If Claude is switched on later, the page says "Read by Claude" instead;
nothing else in the script changes. Screen at 1440 × 900, browser zoom 110%.

---

**0:00 · Home page, top.**
> "Dive trips go wrong in predictable ways: right place, wrong month; a day boat that can't
> reach the famous site; an encounter that turns out to be snorkel-only. Sightline is a
> reference built to catch those before you book."

**0:15 · Click *Describe your trip*. Type:**
`Mantas in September. I'm Advanced with about 40 dives, I get seasick, and my partner snorkels. Is it expensive?`
**Press Plan it.**
> "I describe the trip the way I'd say it. It becomes ordinary, editable filters:
> September, manta rays, Advanced. Plus two worries no filter could hold: seasickness and a
> partner who doesn't dive. It says plainly what it won't answer: Sightline has no evidence
> on cost."

*Point at the small line under the box: "Read by keyword rules…".*
> "It always says what read the text."

**0:45 · Scroll to the results.**
> "Good fits first: Kona, Ningaloo, Nusa Penida. Then fits with a catch, each card showing the
> one that matters. Komodo: *rough water* in September, which matters because I get seasick.
> Raja Ampat: limited access and rough water. Baa Atoll: the mantas there are *snorkel-only*."

**1:05 · Scroll to *Close, but…*.**
> "Instead of a dead end, places that miss by exactly one thing. Tubbataha is closed in
> September, and it fits this trip March to June."

**1:20 · Tick *Compare* on Nusa Penida, Komodo and Baa Atoll; open the comparison.**
> "Side by side against the same trip: each part of the brief, the catches, and what each
> record says about my worries." *Switch the month once.* "The month changes in place."

**1:45 · Open Komodo. In *Ask about Komodo*, type:** `How rough is the crossing?`
> "Answers are the record's own sentences, quoted exactly, each with its source check. No
> model writes anything you read."

**Then type:** `Is there good nightlife?`
> "And when the record is silent, it says so, instead of guessing."

**2:10 · On Komodo, find the access note marked *Corrected after a source check* and open it.**
> "Key claims show whether their sources support them: the passage, the date checked. This
> one was wrong. Our own record put the best manta season in the worst access window, and
> all three sources said the opposite. The page says it was corrected and why."

**2:30 · Cut to the terminal, `bun run eval` output (or the About page, *How it's checked*).**
> "Everything here is tested. The search it replaced got 11 of 29 test trips right; this gets
> 29. For worries, a curated vocabulary finds evidence 93% of the time; embedding search
> managed 33 to 44, so it isn't in the product. The language model does the one job rules
> can't, reading your words, behind validation gates and spend caps. Its evaluation was
> designed, with pass marks written down, before a single paid run."

**2:45 · End on the results page.**
