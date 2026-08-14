CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id text NOT NULL,
  name text NOT NULL,
  website text,
  blurb text,
  source_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published')),
  session_id text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.operators TO anon, authenticated;
GRANT ALL ON public.operators TO service_role;

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can suggest an operator"
  ON public.operators FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(name) BETWEEN 1 AND 200
    AND char_length(coalesce(blurb, '')) <= 1000
  );

CREATE POLICY "Published operators are public"
  ON public.operators FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE INDEX operators_destination_status_idx ON public.operators (destination_id, status);

INSERT INTO public.operators (destination_id, name, website, blurb, source_url, status) VALUES
('komodo', 'Dragon Dive Komodo', 'https://dragondivekomodo.com', 'Land-based dive center in Labuan Bajo running daily boat trips to the north and south Komodo sites.', 'https://dragondivekomodo.com', 'published'),
('komodo', 'Blue Marlin Dive Komodo', 'https://www.bluemarlindive.com/komodo/', 'Long-running land-based operator and dive school, strong on current-heavy sites like Batu Bolong and Castle Rock.', 'https://www.bluemarlindive.com/komodo/', 'published'),
('socorro', 'Nautilus Liveaboards', 'https://nautilusliveaboards.com/socorro/', 'Liveaboard fleet out of Cabo San Lucas specialising in Revillagigedo big-animal itineraries.', 'https://nautilusliveaboards.com/socorro/', 'published'),
('socorro', 'Solmar V', 'https://solmarv.com', 'Veteran Socorro liveaboard known for long-standing giant manta and shark itineraries.', 'https://solmarv.com', 'published'),
('tubbataha', 'Philippine Siren (Worldwide Dive and Sail)', 'https://www.bluewaterdivetravel.com/liveaboard/philippine-siren-liveaboard', 'Traditional wooden phinisi liveaboard running seasonal Tubbataha Reef expeditions from Puerto Princesa.', 'https://www.bluewaterdivetravel.com/liveaboard/philippine-siren-liveaboard', 'published'),
('tubbataha', 'Discovery Palawan', NULL, 'Palawan-based liveaboard operating the short Tubbataha season with multi-day reef and wall itineraries.', 'https://www.dive-the-world.com/liveaboard-philippines-discovery-palawan.php', 'published'),
('baa-atoll', 'Four Seasons Resort Maldives at Landaa Giraavaru', 'https://www.fourseasons.com/maldiveslg/', 'Resort dive center in Baa Atoll with in-house marine research and Hanifaru-season manta excursions.', 'https://www.fourseasons.com/maldiveslg/', 'published'),
('baa-atoll', 'Ocean Dimensions Dhigufaru', NULL, 'Resort-based PADI dive center covering Baa Atoll channels, thilas and manta aggregation sites.', 'https://www.padi.com/dive-center/maldives/ocean-dimensions-dhigufaru/', 'published'),
('galapagos', 'Galapagos Sky', 'https://galapagossky.com', 'Liveaboard running the classic Wolf and Darwin itinerary for hammerhead and whale shark diving.', 'https://galapagossky.com', 'published'),
('galapagos', 'Galapagos Master', NULL, 'Liveaboard offering week-long northern-island itineraries focused on big pelagics and schooling sharks.', 'https://www.dive-the-world.com/liveaboard-galapagos-master.php', 'published');