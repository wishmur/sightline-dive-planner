# Sightline

Build a dive trip planning web app called Sightline. This is a 

high-fidelity prototype — no database needed, use mock data 

throughout. Two screens connected by navigation.

PRODUCT CONCEPT

Sightline answers a question no other dive platform does: 

"I want to see mantas in September — where should I go?"

It combines seasonality, real-time diver sightings, and 

conditions into a trip planner. Target user: certified 

recreational divers (AOW+) planning international dive trips.

VISUAL DIRECTION

Editorial, cinematic, dark-mode primary. Think Patagonia 

travel content meets Linear's product polish. NOT a typical 

SaaS look.

Palette:

- Background: deep ocean navy #0A1628 (primary), #0F1F33 (cards)

- Surface: glassmorphism (white at 5-8% opacity, backdrop-blur)

- Text: #F5F7FA primary, #94A3B8 secondary

- Accent: bright cyan #00D4FF for CTAs and key data

- Warm accent: coral #FF8B5C for "peak season" indicators

- Use full-bleed underwater photography placeholders 

  (Unsplash search terms: "scuba diving", "manta ray", 

  "coral reef", "diver underwater")

Typography:

- Display: Fraunces (serif) — for hero text, location names

- Body: Inter — for everything else

- Generous letter-spacing on uppercase eyebrow labels

SCREEN 1: PLANNER (homepage)

- Top nav: "Sightline" wordmark left, minimal nav links right

  ("Destinations", "Sightings", "Trips", "Profile" avatar)

- Hero section: large editorial headline

  "Plan dives by what you'll see, not just where you'll go."

  Subtitle: "Marine life seasonality, real diver sightings, 

  and live conditions — in one place."

- Below hero, large pill-shaped search bar with two fields:

  Field 1: "What do you want to see?" — dropdown with 

  marine life options (Manta rays, Whale sharks, Hammerheads, 

  Great whites, Sea turtles, Mola mola, Thresher sharks, 

  Reef sharks). Each option has a small icon.

  Field 2: "When?" — month picker (defaults to current month)

  Big cyan "Find dives" button on the right.

- Results section below: "3 destinations match" 

- 3 destination cards in a vertical stack (full-width, not grid):

  Each card has:

    - Full-bleed photo background (underwater scene)

    - Glassmorphism overlay on bottom half with content

    - Location name in large Fraunces serif

    - Country, smaller

    - Status badge: "PEAK SEASON" in coral, or 

      "OCCASIONAL SIGHTINGS" in muted blue

    - 3 data points in a row with icons:

      • "47 manta sightings this week"

      • "Visibility: 25-30m"

      • "Water temp: 27°C"

    - Row of 4 small circular avatars: "Recent divers"

    - Skill level indicator: "Advanced+" or "All levels"

    - "View details →" link in cyan

  

  Card 1: Komodo, Indonesia — PEAK SEASON

  Card 2: Socorro, Mexico — PEAK SEASON  

  Card 3: Maldives — OCCASIONAL SIGHTINGS

- Below cards, smaller section: "Sightings near you this week"

  Horizontal scroll of small sighting cards (diver name, 

  what they saw, location, photo thumbnail, time ago)

SCREEN 2: DESTINATION DETAIL (clicking a card)

- Full-bleed hero image of the location with location name 

  overlaid in large Fraunces serif at the bottom

- Below hero: tab nav (Overview, Sightings, Conditions, Operators)

- Overview tab content (default):

  - Three stat cards side by side: 

    "Best months" (visual: 12-month bar showing intensity)

    "Skill level required" (Advanced Open Water+)

    "Avg trip cost" ($2,800-$4,500)

  - "Why September?" section with editorial paragraph 

    explaining manta aggregation patterns

  - "Recent sightings" — vertical feed of 4-5 entries: 

    diver avatar + name, what they saw with count 

    ("3 mantas, 1 reef shark"), location detail, 

    timestamp ("2 days ago"), photo thumbnail

  - Conditions snapshot grid: water temp, visibility, 

    current strength, surface conditions — each with 

    icon and value

  - Bottom CTA: "Plan a trip to Komodo" — large cyan button

INTERACTION NOTES

- Search button can update results (mock — just change 

  state to show different mock cards)

- Cards on Screen 1 navigate to Screen 2

- Use Framer Motion or CSS for subtle animations: fade-ins 

  on scroll, hover lift on cards

- This is desktop-first, but make it responsive

DO NOT

- Add login/auth flows

- Add a real backend or database

- Build more than these two screens

- Use generic blue (#0066FF) — go deep navy

- Make it look like a typical SaaS dashboard

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sightline-dive-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ef4e86eb-5313-4472-8309-360be9180cf9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
