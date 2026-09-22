# Adjudication packet: supported vs partial

The Claude verifier judged these 25 claims "partial" where the human review had said "supported".
In a sample of seven, it named a specific decisive detail missing from the cited pages, so this
may be a difference in strictness rather than an error. Adjudicating them decides two things:
whether the gold labels need a stated strictness rule, and whether the verifier's 59% accuracy
(against a 60% bar) was measured against a lenient gold.

Rules: judge only against the cited pages, not general knowledge. Decide per claim, then record
the outcome in data/verification/reviews.json with a dated reason. Do not change the measured
numbers retroactively: report pre- and post-adjudication accuracy separately.

Generated 2026-09-22 from the recorded run (no new API calls).

### 1. alor/species/scalloped-hammerhead

**Claim (Scalloped hammerhead), as reviewed:** Two independent sources now support a cold-upwelling hammerhead season, though they disagree on extent: ZuBlu gives March-November with Sep-Nov strongest, Alor Underwater Explorers gives a Sep-Dec pelagic season. Encoded to the overlap plus the stronger claim. Still no research literature located, so this remains a commercial-consensus claim rather than a verified one. Do not book Alor solely for this.

**Verifier says partial:** Both pages support a cold-upwelling hammerhead peak, and ZuBlu's March–November window with a September–November best period is stated verbatim. Alor Underwater Explorers, however, labels its "Pelagic Season" as September–November (Sept–December is the cold-upwelling/lunar window), and says hammerheads are not strictly seasonal but possible year-round, so the claim's "Sep–Dec pelagic season" attribution is only partly borne out; neither page speaks to research literature.

**Its surviving quotes:**
- "Hammerhead sharks From March to November" — https://www.zubludiving.com/destination/indonesia/nusa-tenggara/alor
- "Alor is one of the few places left in Indonesia where visitors have a reasonable chance of sighting hammerheads during the cold water periods." — https://www.zubludiving.com/destination/indonesia/nusa-tenggara/alor
- "Combined with the cold upwelling period (September through December), a full or new moon week is the highest-probability window for big-animal encounters" — https://alorunderwaterexplorers.com/guide-to-diving-in-alor/
- "September to November is the Pelagic Season — lower visibility but the best chance for Hammerheads, Mola Mola, and Thresher Sharks." — https://alorunderwaterexplorers.com/guide-to-diving-in-alor/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 2. azores/highlight/1

**Claim (Blue and shortfin mako sharks), as reviewed:** BAITED, using what operators describe as minimal chumming, with no cage, in open blue water off Pico. Reported sighting success above 90% in season and up to 20 blue sharks on a dive. Touching and feeding the animals is prohibited; the chum brings them, the divers do not interact. This is the clearest case in the dataset of a destination that is entirely honest about baiting and still worth encoding, because the alternative framing ('seen with surprising regularity') appears on other pages for the same dives.

**Verifier says partial:** The pages confirm baiting via "minimal chumming", the >90% success rate, up to 20 blue sharks per dive, the no-touch/no-feed rule, and the Pico location and season. Neither page states that the dives are done without a cage or explicitly describes them as open blue-water dives, so that detail is unverified.

**Its surviving quotes:**
- "Success rate: Over 90% chance of spotting sharks, with up to 20 blue sharks per dive." — https://shark-diving.com/dive-center/cw-azores/
- "Minimal chumming is used, and touching or feeding the sharks is prohibited." — https://shark-diving.com/dive-center/cw-azores/
- "From July to mid-October, CW Azores offers diving excursions where you have the chance to observe blue and mako sharks in their natural habitat." — https://shark-diving.com/dive-center/cw-azores/
- "Between July and October, mako and blue sharks can be seen with surprising regularity at remote seamounts around the island of Pico." — https://www.zubludiving.com/articles/zublu-insights/sharks-whales-and-rays-marine-highlights-of-the-azores

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 3. baa-atoll/operating

**Claim (Access and operating season), as reviewed:** The atoll is open and divable all year, but Hanifaru Bay itself is a seasonal southwest-monsoon phenomenon running roughly May to December. Outside that window the resorts and dive sites operate normally and the bay is simply empty, so Jan-Apr reads 'limited' rather than 'closed': you can go, you will dive, you will not see the thing Baa Atoll is famous for.

**Verifier says partial:** The page supports the May–December aggregation window and its link to the southwest monsoon. It says nothing about whether Baa Atoll's resorts and dive sites operate normally in January–April or that the bay is accessible-but-empty then, so that part of the claim is unverified here.

**Its surviving quotes:**
- "Hanifaru Bay’s feeding aggregations can occur from May to December, but the best times are usually from late July to early October" — https://www.zubludiving.com/articles/zublu-insights/hanifaru-bay
- "The manta gathering occurs during the southwest monsoon, known quite rightly as the wet season." — https://www.zubludiving.com/articles/zublu-insights/hanifaru-bay
- "Manta season falls within Baa Atoll’s wet southwest monsoon" — https://www.zubludiving.com/articles/zublu-insights/hanifaru-bay

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 4. baa-atoll/species/reef-manta-ray

**Claim (Reef manta ray), as reviewed:** Present in the Maldives year-round; the Hanifaru mass-feeding aggregation runs May-December with the strongest conditions late July to early October, particularly around full and new moon. Aggregation is driven by lunar tidal cycles concentrating plankton, so the moon matters more than the month.

**Verifier says partial:** The page supports the May–December aggregation window, the late July–early October peak, the full/new moon timing and the tidal-current plankton mechanism. It says nothing about reef mantas being present in the Maldives year-round, and it in fact frames the season months as decisive alongside the moon.

**Its surviving quotes:**
- "Hanifaru Bay’s feeding aggregations can occur from May to December, but the best times are usually from late July to early October" — https://www.zubludiving.com/articles/zublu-insights/hanifaru-bay
- "particularly around the full or new moon, when the increased tidal currents create the highest concentrations of food in the bay" — https://www.zubludiving.com/articles/zublu-insights/hanifaru-bay

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 5. cabo-pulmo/experience

**Claim (Conditions and experience), as reviewed:** Shallow reefs at 15m suit beginners; the seamounts (El Bajo, Meros) and the standard drift profile suit intermediate and up. Water hits 18C around March, which catches people who booked Mexico expecting warm water. Park rules are strict and enforced: 45-minute maximum dive time, no touching, 2m standoff from the reef, no collecting. The time limit in particular changes how you plan a dive. Access to El Vencedor runs through a weekly lottery among operators with no way to buy priority, so the headline site is not guaranteed even on a booked trip. Nearest hyperbaric chamber is San Jose del Cabo, 1.5 hours away, and the village is off-grid.

**Verifier says partial:** Park rules (45-minute limit, no-touch, 2m standoff, no collecting), 15m shallow reefs for all levels, drift/intermediate profile, 18°C in March, the weekly El Vencedor lottery with no VIP override, the San José del Cabo chamber 1.5 hours away and the off-grid village are all stated on the cited pages. The one unsupported element is the framing of El Bajo as a seamount suited to intermediate-plus divers: ZuBlu calls El Bajo and Meros seamounts, while Divearoo explicitly says Cabo Pulmo's El Bajo is a shallow reef bar rated Open Water.

**Its surviving quotes:**
- "Many of Cabo Pulmo's reefs begin in just 15 metres of water, making them easily accessible for divers of all certification levels." — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "most of the park's exploration is done via drift diving. As a result, this destination is ideal for intermediate divers" — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "head offshore to El Bajo and Meros - a pair of seamounts famous for their thriving coral gardens, sea turtles, schooling reef fish" — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "Water temperatures within the park fluctuate between a balmy 29°C from June to November and a frigid 18°C in March." — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "The collecting of seashells, plants and animals, and artefacts is prohibited above water, as well." — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "The nearest hyperbaric chamber is in San José del Cabo (around 1.5 hours away)" — https://divearoo.com/destinations/mexico/sea-of-cortez/cabo-pulmo
- "Accommodation in Cabo Pulmo is small-scale and almost entirely off-grid solar." — https://divearoo.com/destinations/mexico/sea-of-cortez/cabo-pulmo

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 6. cabo-pulmo/operating

**Claim (Access and operating season), as reviewed:** Year-round diving with no closure. The constraint is permit capacity: roughly two dive groups per site per day, with El Vencedor allocated by weekly lottery. Both sources agree Aug-Dec gives the warmest water (27-30C) and best visibility (24-27m); ZuBlu's Feb-Jun bull shark window sits in the coldest, murkiest part of the year, which is part of why the contradiction matters. Book 3-6 months ahead for peak season.

**Verifier says partial:** Year-round season, the two-groups-per-site permit cap, and the weekly El Vencedor lottery are all stated on the pages, as is the Feb–Jun bull shark window falling in the cold/low-viz part of the year. However, "both sources agree" on Aug–Dec is overstated: only Divearoo gives Aug–Dec with 27–30 °C and 24–27 m viz, while ZuBlu puts warm water Jun–Nov and peak season Oct–Jan with 10–30 m viz; the "book 3–6 months ahead" figure appears nowhere (Divearoo only says "months ahead"/"well in advance").

**Its surviving quotes:**
- "Diving Season
Year round" — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "This guarantees no more than two dive groups per site, and a limited number of boats visiting each day." — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "November – December 24 to 27 °C (75 to 81 °F), peak viz at 24 to 27 m" — https://divearoo.com/destinations/mexico/sea-of-cortez/cabo-pulmo
- "Bull sharks From February to June" — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo
- "From April to July, visibility is lower, and water temperatures plummet." — https://www.zubludiving.com/destination/mexico/baja-california/cabo-pulmo

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 7. cocos/experience

**Claim (Conditions and experience), as reviewed:** Strong current and significant surge are the norm, not the exception. Operators expect solid buoyancy and the ability to deploy an SMB independently, because blue-water ascents away from the pinnacle are routine. Deep sites past 30m. Thermoclines are sharp and seasonal, and the cold water is often exactly where the hammerheads are. Two days from the nearest chamber.

**Verifier says partial:** Supported: SMB skill and buoyancy expectation, routine open-water/blue drift ascents with only two moored sites, 30m+ depths, seasonal thermoclines, and ~36-40 hours (roughly two days) to Puntarenas with the chamber in San José. Not supported: the framing that strong current/surge is 'the norm, not the exception' (DAN says much of the diving can be easy and rough conditions occur 'on some days'), and the assertion that hammerheads are typically in the cold water.

**Its surviving quotes:**
- "Good buoyancy control is paramount, and knowing how to deploy a surface marker buoy (SMB) is a necessary skill." — https://dan.org/alert-diver/article/cocos-island/
- "The sites are deep, typically reaching 100 feet (30 meters) or more." — https://dan.org/alert-diver/article/cocos-island/
- "If a life-threatening emergency arises, it's a 36-hour boat ride to Puntarenas, and the nearest recompression chamber is in San José." — https://dan.org/alert-diver/article/cocos-island/
- "Thermoclines are common, and deep down can get into the 60s." — https://www.bluewaterdivetravel.com/destination/cocos-island-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 8. cocos/operating

**Claim (Access and operating season), as reviewed:** Liveaboards run year-round; there is no closed season. The seasonal split is a quality trade rather than an access one: Jun-Oct rainy season gives the best hammerhead schooling and the worst visibility (9-20m), Dec-May dry season gives up to 30m visibility and less consistent schooling.

**Verifier says partial:** Year-round diving (no closure mentioned), the June–October hammerhead peak, dry-season visibility up to ~30m and better Jan–May visibility are supported; neither page states an explicit closed season or assigns a 9–20m visibility range specifically to the rainy season (Bluewater in fact reports 50–70ft in June/July). The two pages also differ on when the rainy season ends (DAN: June–October; Bluewater: June–November).

**Its surviving quotes:**
- "Diving is good all year, but one of the main highlights is the schooling scalloped hammerhead sharks in the rainy season from June through October." — https://dan.org/alert-diver/article/cocos-island/
- "Visibility averages 30 to 70 feet (9 to 21 meters) and can be up to 100 feet in the dry season." — https://dan.org/alert-diver/article/cocos-island/
- "Scuba diving Cocos Island can be done in both rainy season and dry season." — https://www.bluewaterdivetravel.com/destination/cocos-island-diving
- "Visibility can be variable but 30-50ft is the norm, with even better visibility from Jan - May." — https://www.bluewaterdivetravel.com/destination/cocos-island-diving
- "you will usually see good numbers of hammerheads throughout the year" — https://www.bluewaterdivetravel.com/destination/cocos-island-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 9. galapagos/species/scalloped-hammerhead

**Claim (Scalloped hammerhead), as reviewed:** Present year-round at Darwin and Wolf. Schooling behaviour is reported strongest in the warm season (Dec-May); the reason for the aggregation is still debated in the literature. Note this cuts against the common assumption that the cold season is uniformly better for big animals.

**Verifier says partial:** The Galapagos Conservation Trust page explicitly supports the warm-season (Dec-May) peak for hammerhead schooling at Wolf and Darwin and that the reason for aggregation is debated. Year-round presence at Darwin/Wolf is not stated on either page, and the Liveaboard page frames the cool season (June-November) as prime for hammerhead schooling, disagreeing on the seasonal peak.

**Its surviving quotes:**
- "The best chance for hammerhead sightings in Galapagos is around the northern-most islands of Wolf and Darwin during the warm season (Dec-May)" — https://galapagosconservation.org.uk/sharks-of-galapagos/
- "schools of these iconic sharks, sometimes over 100-strong, can be seen swimming in vast circles" — https://galapagosconservation.org.uk/sharks-of-galapagos/
- "although the reason behind this gregarious behaviour is still debated" — https://galapagosconservation.org.uk/sharks-of-galapagos/
- "even hammerhead sightings remain common at sites like Punta Vicente Roca and Kicker Rock (León Dormido)" — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-the-galapagos

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 10. galapagos/species/whale-shark

**Claim (Whale shark), as reviewed:** Jun-Sep per Galapagos Conservation Trust, Jul-Oct per liveaboard sources; encoded as the union with Jul-Oct as peak. Almost exclusively at Darwin. Mature pregnant females, unlike every other known aggregation.

**Verifier says partial:** Both month windows (Jun–Sep from GCT, Jul–Oct peak from Liveaboard) and the mature-pregnant-female character of the aggregation are stated on the pages. The claim that sightings are "almost exclusively at Darwin" is not supported: both pages pair Darwin with Wolf without singling out Darwin. GCT also says "unlike aggregations in many other locations," slightly weaker than "every other known aggregation."

**Its surviving quotes:**
- "In Galapagos, whale sharks are regularly sighted around Darwin and Wolf between the months of June and September." — https://galapagosconservation.org.uk/sharks-of-galapagos/
- "Divers come in search of whale sharks, most reliably seen between July and October" — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-the-galapagos
- "a very high proportion of the females had swollen abdomens, suggesting that they were in an advanced stage of pregnancy" — https://galapagosconservation.org.uk/sharks-of-galapagos/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 11. komodo/experience

**Claim (Conditions and experience), as reviewed:** Two different destinations in one park. North is warm (27-28C) and clear with hard current; south runs 22-24C on upwelling with green plankton-rich water and visibility that can fall to 5m. Divers pack for Indonesia and get cold in the south. Downcurrents and washing-machine conditions occur at the pinnacles and are the real risk; reef hooks, negative entries and SMB competence are expected. Advanced is the practical floor despite some operators taking Open Water divers to the easier sites.

**Verifier says partial:** Temperatures (north 27-28C; south ~23-24C, claim says 22-24), green plankton-rich southern water, 5m minimum southern visibility, reef hooks/negative entries/SMB, and the advanced-with-easier-site-exceptions level are all stated on the pages. No cited page mentions downcurrents or 'washing-machine' pinnacle conditions as the principal risk, and Bluewater's headline dive level is 'All Levels' against ZuBlu's 'advanced divers upwards'.

**Its surviving quotes:**
- "North Komodo enjoys water temperatures of 27-28C, while the south is considerably colder with averages of around 23-24C." — https://www.zubludiving.com/destination/indonesia/nusa-tenggara/komodo
- "Visibility varies from week to week but is typically between 5-20m in the south, and 15-30m in the north." — https://www.zubludiving.com/destination/indonesia/nusa-tenggara/komodo
- "many of Komodo’s most famous sites involve current, negative entries, reef hooks, drift dives, and live boat pickups." — https://www.bluewaterdivetravel.com/destination/komodo-diving
- "An SMB or DSMB is essential for Komodo diving, and divers should be comfortable deploying one before the trip." — https://www.bluewaterdivetravel.com/destination/komodo-diving
- "Level
Advanced divers upwards - most of Komodo's sites have strong currents" — https://www.zubludiving.com/destination/indonesia/nusa-tenggara/komodo
- "Some easier sites may be suitable for less experienced divers, especially from Labuan Bajo day boats" — https://www.bluewaterdivetravel.com/destination/komodo-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 12. kona/operating

**Claim (Access and operating season), as reviewed:** Leeward coast, sheltered by the volcano. Diveable close to every day of the year. Winter swell restricts shore entries but not boat operations.

**Verifier says partial:** The leeward/sheltered setting and near-daily year-round diveability are directly stated, and swell-dependent shore diving being better in summer is supported by implication. Neither page states that winter swell leaves boat operations unaffected; Bluewater only notes a choppier winter surface.

**Its surviving quotes:**
- "Conditions in Kona (the "dry" side of the island) are good for diving nearly every day of the year." — https://www.bluewaterdivetravel.com/destination/kona-diving
- "Kona gains a huge advantage from having blue oceanic water and mountains that block the prevailing winds." — https://dan.org/alert-diver/article/kona-hawaii/
- "Shore diving is best enjoyed when there is no ocean swell, which is a more common condition during the summer months." — https://dan.org/alert-diver/article/kona-hawaii/
- "The water is a little colder (down to 75 degrees) and the surface a bit choppier in the winter months" — https://www.bluewaterdivetravel.com/destination/kona-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 13. la-paz/operating

**Claim (Access and operating season), as reviewed:** Diving runs year-round, but Los Islotes, the single biggest draw, is closed 1 June to 31 August for sea lion breeding. That is a hard site closure inside an otherwise open destination, which is why Jun-Aug reads 'limited' rather than 'open' or 'closed'. Hurricane season overlaps the same window.

**Verifier says partial:** The page confirms year-round diving and the 1 June-31 August sea lion colony breeding closure (Los Islotes being the area's main sea lion site). It says nothing about hurricane season overlapping that window, only heat, humidity and some rain later in the season.

**Its surviving quotes:**
- "The sea lion colonies are active year-round, however, they are closed for breeding from June 1st to August 31st each year." — https://www.bluewaterdivetravel.com/destination/la-paz-diving
- "Diving in La Paz is possible year-round, but the best time to go depends on what you want to see." — https://www.bluewaterdivetravel.com/destination/la-paz-diving
- "June - November: The summer months are hot and humid top-side, with some rain towards the end of the season." — https://www.bluewaterdivetravel.com/destination/la-paz-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 14. malapascua/highlight/1

**Claim (Pelagic thresher sharks), as reviewed:** The only destination where pelagic threshers are seen predictably and daily. They come to reef-fish cleaning stations on a seamount plateau; a PLOS ONE study documented 97 cleaning events over 1,230 hours of video across 232 days, with frequency highest in the morning and declining through the day. Dawn departures around 04:00, no strobes or lights permitted.

**Verifier says partial:** The study figures (97 events, 1,230 hours, 232 days), the morning-to-evening decline, the seamount-plateau cleaning stations, and the predictable daily uniqueness of Malapascua are all supported. Neither page mentions a ~04:00 departure time or any prohibition on strobes/lights; DAN also notes the threshers have largely shifted from Monad to the shallower Kimud Shoal.

**Its surviving quotes:**
- "From 1,230 hours of observations recorded by remote video camera between July 2005 and December 2009, 97 cleaner-thresher shark events were analyzed" — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0014755
- "Observations of cleaning events were recorded at all times of day but their frequency declined gradually from morning until evening" — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0014755
- "in 1,230 hours of remote video on 232 days over 16 months (July 2005 to December 2009)" — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0014755
- "Malapascua is unique. Seeing multiple threshers there is a predictable daily occurrence in the morning when they approach known cleaning stations." — https://dan.org/alert-diver/article/malapascua/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 15. malapascua/species/pelagic-thresher-shark

**Claim (Pelagic thresher shark), as reviewed:** Present year-round; the constraint is time of day, not month. Cleaning-station visits decline significantly from morning to evening. Sighting probability on a given dawn dive is high but not guaranteed, and surface conditions cancel more dives Jun-Oct than the sharks do.

**Verifier says partial:** Year-round presence and the morning-to-evening decline in cleaning-station activity are directly stated by the cited pages, as is the daily-but-not-certain nature of dawn sightings. No page addresses dive cancellations from surface conditions in a Jun–Oct window; the DAN page only notes rain Jun–Sept and typhoons possible May–October.

**Its surviving quotes:**
- "Thresher sharks are present year-round, but the island can get crowded during the busy holiday periods, such as Christmas, Chinese New Year, and Easter." — https://dan.org/alert-diver/article/malapascua/
- "thanks to the island's thriving reefs and cleaning stations, thresher sharks can be spotted here 365 days a year." — https://www.zubludiving.com/articles/zublu-insights/thresher-sharks-of-malapascua
- "Seeing multiple threshers there is a predictable daily occurrence in the morning when they approach known cleaning stations." — https://dan.org/alert-diver/article/malapascua/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 16. malta/operating

**Claim (Access and operating season), as reviewed:** Apr-Oct is the season, with the warmest water and the calmest sea. Diving continues through winter but water falls to 14-15C and the operator base thins out, hence 'limited' rather than 'closed' for Dec-Mar: the islands are dived year-round by drysuit divers and by technical teams, just not by the holiday market.

**Verifier says partial:** The page supports the Apr-Oct window, warmest water, year-round drysuit diving, and the 14-15C winter floor. It does not state that operator availability thins in winter or that technical teams keep diving then; and the 'calmest sea' framing is qualified by the page's note that it 'can still be quite windy during these months'.

**Its surviving quotes:**
- "The best time to dive in Malta is during the summer months of April through October." — https://www.bluewaterdivetravel.com/destination/malta-diving
- "the water is at its warmest and you have the best chance of uninterrupted diving" — https://www.bluewaterdivetravel.com/destination/malta-diving
- "Malta can be dived year-round by hardened drysuit divers; however, water temperatures can drop as low as 57F (14C) in the winter months." — https://www.bluewaterdivetravel.com/destination/malta-diving
- "Water Temperatures: Range from59 - 82F (15-28C)" — https://www.bluewaterdivetravel.com/destination/malta-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 17. ningaloo/format/0

**Claim (Day trip from hub · snorkel), as reviewed:** The whale shark and humpback swims. Licensed operators only, spotter aircraft, up to 10 swimmers in the water at a time from boats of around 20 guests, regulated approach distances. Twelve or so licensed whale shark operators between Exmouth and Coral Bay. If whale sharks are the reason for the trip, a diving certification buys you nothing.

**Verifier says partial:** The pages support licensed-operator-only tours, spotter planes, groups of 10 in the water from ~20-guest boats, regulated distances, and snorkel-only (no scuba). Neither page states a count of licensed operators, so 'twelve or so' is unverified.

**Its surviving quotes:**
- "Pilots in spotter-planes fly overhead and locate animals, then the tour boats race to the location" — https://divernet.com/world-dives/australia-oceania/ningaloo-reef-dive-guide/
- "There's no scuba involved; just snorkelling and freediving." — https://divernet.com/world-dives/australia-oceania/ningaloo-reef-dive-guide/
- "whale shark tours at Ningaloo are responsibly run by a small group of licensed professionals" — https://www.australiascoralcoast.com/see-do/swim-ningaloo-whale-sharks

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 18. nusa-penida/experience

**Claim (Conditions and experience), as reviewed:** Current is a condition here, not an attraction. North coast sites run as sustained drift and are manageable; Crystal Bay and Manta Point produce unpredictable down- and up-currents and are where incidents happen. Open Water is workable at Manta Point in calm conditions; 50+ logged dives is the practical bar for Crystal Bay, and Advanced is effectively required for mola dives at 30m. Thermocline drops to 16-19C during the Jul-Oct upwelling: a 3mm suit is not enough in cold season.

**Verifier says partial:** Supported: manageable sustained drift on the north coast, Crystal Bay's unpredictable up/down-currents, Open Water feasible at Manta Point in calm seas, the 50-dive bar for Crystal Bay, Advanced for ~30m mola dives, and cold thermoclines with a 5mm recommended (implying 3mm is insufficient, though one author reports diving 3/4mm plus a hooded 2mm top). Not supported: that Manta Point produces unpredictable down- and up-currents (pages cite rough surface swells Dec–Mar instead) or that these two sites are 'where incidents happen'; ZuBlu also reports colder south-coast figures (16-17C, dips to 13-14C) than the claim's 16-19C band.

**Its surviving quotes:**
- "The currents are sustained but manageable, though diving at slack tide may require a few fin kicks." — https://worldadventuredivers.com/diving-nusa-penida-2/
- "the further you swim away from the beach, the stronger and more unpredictable down- and up-currents get" — https://worldadventuredivers.com/diving-nusa-penida-2/
- "When the sea is calm, the shallow cleaning station (5–10m) makes it accessible to Open Water divers like snorkelers ." — https://worldadventuredivers.com/diving-nusa-penida-2/
- "If you have fewer than 50 dives, I highly recommend gaining more experience before attempting these sites." — https://worldadventuredivers.com/diving-nusa-penida-2/
- "These deepwater giants typically appear around 30m, making an Advanced Open Water certification essential." — https://worldadventuredivers.com/diving-nusa-penida-2/
- "a thermocline dropped the temperature to 19°C at Crystal Bay in September during one of my dives —so a 5mm wetsuit is recommended" — https://worldadventuredivers.com/diving-nusa-penida-2/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 19. raja-ampat/operating

**Claim (Access and operating season), as reviewed:** The 'limited' case this field exists for. Nothing closes, but from roughly May to September the southern monsoon brings strong winds, high waves and visibility down to 10-15m, and a substantial share of the liveaboard fleet suspends Raja Ampat itineraries or repositions elsewhere in Indonesia. July and August are the worst of it. Resorts stay open and sheltered sites stay diveable, so you can still go, at lower prices, with fewer options and a real chance of blown-out days.

**Verifier says partial:** The pages support the rough May/June–September window, strong southern winds and high waves, July–August as the worst stretch with many liveaboards suspending operations, 10–15m visibility then, resorts still open but cancelling dives on windy days, and lower prices. Not supported: boats 'repositioning elsewhere in Indonesia', and the 10–15m figure applied across the whole May–September span (Bluewater gives 15–25m for May–June); the two pages also differ on whether the low season starts in May or June.

**Its surviving quotes:**
- "These are Raja Ampat's stormiest months. Persistent rains and strong southern winds can whip up high waves, particularly in Dampier Strait." — https://www.bluewaterdivetravel.com/article/raja-ampat-dive-season-explained
- "Many liveaboards suspend operations in July–August, and even resorts may cancel dives on very windy days." — https://www.bluewaterdivetravel.com/article/raja-ampat-dive-season-explained
- "Wet season (May–Sep): more rain and wind, especially Jul–Aug; lower vis, rougher crossings, fewer boats and lower prices" — https://www.bluewaterdivetravel.com/article/raja-ampat-dive-season-explained
- "Stronger winds and rougher seas make certain regions inaccessible, especially for liveaboards. Operators may reduce departures or focus on more sheltered areas." — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-raja-ampat-indonesia

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 20. raja-ampat/species/whale-shark

**Claim (Whale shark), as reviewed:** IMPORTANT DISAMBIGUATION. Whale sharks are widely advertised alongside Raja Ampat but they are not in Raja Ampat. The aggregation is in Cenderawasih Bay, roughly a three-day passage east, where the animals gather around fishing platforms (bagans) and are hand-fed by fishermen. Encoded 'absent' for Raja Ampat itself, and flagged as provisioned rather than natural. If whale sharks are the reason for the trip, you are booking the wrong itinerary.

**Verifier says partial:** The page supports the absence of whale sharks from central Raja Ampat, the Cenderawasih Bay location roughly three days east of Sorong, and the aggregation around bagans/fishing platforms. It does not state that the sharks are hand-fed or provisioned by fishermen — it describes them as 'feeding on bait fish' — so the provisioning claim is unverified here.

**Its surviving quotes:**
- "Whale sharks are NOT in the central Raja Ampat archipelago year-round. The reliable site is Cenderawasih Bay, 3-day passage east of Sorong" — https://luxuryrajaampat.com/blog/raja-ampat-marine-life-guide-2026/
- "adolescent whale sharks gather around bagans (fishing platforms) feeding on bait fish. Encounters guaranteed May-October." — https://luxuryrajaampat.com/blog/raja-ampat-marine-life-guide-2026/
- "While the central Raja Ampat archipelago lacks reliable whale sharks, Cenderawasih Bay (3 days east of Sorong) hosts the world's most predictable whale shark encounter" — https://luxuryrajaampat.com/blog/raja-ampat-marine-life-guide-2026/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 21. rangiroa/operating

**Claim (Access and operating season), as reviewed:** Open year-round with no closure. Jun-Sep is the peak tourist season and the drier half; Dec-Mar is warmer, wetter and carries the hammerhead window. The two headline seasons pull in opposite directions, which is the useful thing to know before booking.

**Verifier says partial:** The page confirms year-round diving with no closure, a June–September high tourist season, and a December–March great hammerhead window. It says nothing about rainfall or air/water temperature patterns, so the "drier half" versus "warmer, wetter" characterization is unverified here.

**Its surviving quotes:**
- "Season: Diving all year long. High tourist season is from June to September. July to September: manta rays. December to March: great hammerheads." — https://www.seacrush.com/en/diving/french-polynesia/rangiroa
- "A 5 mm wetsuit between July and October, and a 3 mm wetsuit the other months of the year" — https://www.seacrush.com/en/diving/french-polynesia/rangiroa

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 22. socorro/experience

**Claim (Conditions and experience), as reviewed:** Ripping current, strong surge, negative entries, blue-water safety stops with no reference, and a two-day boat ride from any hyperbaric chamber. Operators generally require Advanced plus 50-100 logged dives, and nitrox is effectively expected. Water drops to 21-23C in the Feb-Apr whale window, which surprises people who packed for Mexico. This is not a first liveaboard. Park fee is $3,760 MXN per diver per day, charged on top of the boat, and diving hours are restricted to 07:00-18:00 by the park authority.

**Verifier says partial:** Supported: strong currents/surge, blue-water safety stops, AOW plus 50 logged dives, cool 21–23°C water in the whale months (Bluewater; ZuBlu's overall range 23–28°C and liveaboard.com's 22–24°C for Feb–Mar are warmer), and that it suits experienced divers. Not addressed by any page: negative entries, the two-day distance from a hyperbaric chamber, nitrox being expected, the $3,760 MXN per-diver-per-day park fee, and a 07:00–18:00 diving-hours restriction (ZuBlu only notes night diving is banned).

**Its surviving quotes:**
- "Nearly every site in the archipelago features ripping currents, strong surge, and non-stop big fish action." — https://www.zubludiving.com/destination/mexico/baja-california/socorro-and-revillagigedo-islands
- "blue‑water safety stops are the norm" — https://www.bluewaterdivetravel.com/destination/socorro-island-diving
- "Experience level: Most liveaboards require a minimum of 50 logged dives and Advanced Open Water certification." — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-the-socorro-islands-mexico
- "Jan–Mar: cooler water (roughly 21–23°C / 70–74°F), but this is when humpback whales with calves are around the islands." — https://www.bluewaterdivetravel.com/destination/socorro-island-diving
- "Not ideal if you get very seasick, prefer easy resort diving, or are new/returning to diving." — https://www.bluewaterdivetravel.com/destination/socorro-island-diving
- "Night diving is prohibited in the marine park due to its extremely remote nature" — https://www.zubludiving.com/destination/mexico/baja-california/socorro-and-revillagigedo-islands

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 23. socorro/operating

**Claim (Access and operating season), as reviewed:** CONANP, the Mexican protected-areas authority, states the tourist diving season as November to June, 07:00-18:00, with a park fee of $3,760 MXN per person per day. That corrects the commercial sources, which variously gave Nov-May and Nov-Jun/Jul. Encoded Nov-Jun open, Jul-Oct closed. The closure is operational and regulatory, not biological: mantas, silvertips and dolphins are resident through it.

**Verifier says partial:** CONANP's stated Nov–June diving season, 07:00–18:00 hours and $3,760 MXN per person per day fee are supported verbatim, as is the spread among commercial sources (Nov–May vs Nov–Jun/Jul). The Jul–Oct closure is only partly supported — ZuBlu gives a diving season of November to July with a break August–October — and no page states the closure's rationale is operational/regulatory rather than biological, nor that silvertips and dolphins are resident through July–October (Bluewater notes mantas and sharks year-round; ZuBlu lists mantas and dolphins Nov–June).

**Its surviving quotes:**
- "The tourist season for scuba diving is from November to June, from 7:00 a.m. to 6:00 p.m." — https://descubreanp.conanp.gob.mx/en/conanp/ANP?suri=143
- "$3,760 MXN Entrance prices per person, per day, as collection of rights." — https://descubreanp.conanp.gob.mx/en/conanp/ANP?suri=143
- "Season: November–May (liveaboards only)" — https://www.bluewaterdivetravel.com/destination/socorro-island-diving
- "The dive season in Socorro is strictly limited to November through May" — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-the-socorro-islands-mexico
- "The Socorro diving season is nearly year-round, with a break during the region's hot summer months, August through October" — https://www.zubludiving.com/destination/mexico/baja-california/socorro-and-revillagigedo-islands
- "Marine life highlights: giant mantas and multiple shark species year‑round" — https://www.bluewaterdivetravel.com/destination/socorro-island-diving

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 24. socorro/species/whale-shark

**Claim (Whale shark), as reviewed:** Sources contradict each other on the window: Nov-Dec, Apr-May, or both. CONANP does not list whale shark among the park's representative species at all, which is itself a signal. Encoded as the conservative union of all claimed windows. Do not book around this.

**Verifier says partial:** The disagreement across sources is supported: Bluewater says Nov–Dec, liveaboard.com says Apr–May, ZuBlu says both windows. The CONANP claim is unverifiable here because the representative-species list on that page is truncated ('Show all species'), so whale shark's absence cannot be confirmed.

**Its surviving quotes:**
- "Whale sharks are most frequently spotted in November and December" — https://www.bluewaterdivetravel.com/destination/socorro-island-diving
- "Whale sharks are more frequently spotted in April and May, particularly on the final trips of the season." — https://www.liveaboard.com/diving/season-calendar/best-time-to-dive-in-the-socorro-islands-mexico
- "Whale sharks
From April to June and From November to December" — https://www.zubludiving.com/destination/mexico/baja-california/socorro-and-revillagigedo-islands
- "Humpback Whale (Megaptera novaeangliae), Giant Oceanic Manta Ray (Manta birostris), Green Sea Turtle (Chelonia mydas), Clarion Angelfish (Ho... Show all species" — https://descubreanp.conanp.gob.mx/en/conanp/ANP?suri=143

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**

---

### 25. tulamben/format/2

**Claim (Day trip from hub · scuba), as reviewed:** Widely sold from Sanur, Seminyak and Ubud, but it is a 3 to 3.5 hour drive each way and puts you on the wreck at peak crowding. Format mismatch risk: the day-trip product delivers a materially worse version of the site than an overnight stay.

**Verifier says partial:** The 3–3.5 hour drive from south Bali, the existence of day-trip diving, and the advantage of an overnight stay/early dive over day-trip crowds (groups arriving ~9am) are all stated. The pages never name Sanur, Seminyak or Ubud as departure points, so that specific detail is unverified.

**Its surviving quotes:**
- "Depending on traffic, Tulamben is a 3 - 3.5-hour drive from south Bali." — https://www.zubludiving.com/destination/indonesia/bali/tulamben
- "Stay overnight and dive early morning to see the bumphead parrotfish and avoid the day-trip crowds" — https://www.zubludiving.com/destination/indonesia/bali/tulamben
- "by arriving before sunrise at 5.50 am on Tulamben Beach, divers can often have the wreck to themselves before most groups arrive around 9 am" — https://worldadventuredivers.com/usat-liberty-shipwreck-bali/

**Decision:** ( ) reviewer was right, keep supported  ( ) verifier is right, mark partial  ( ) unclear

**Why:**
