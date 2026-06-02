export type MarineLife = {
  id: string;
  name: string;
  icon: string; // emoji as lightweight icon
};

export const MARINE_LIFE: MarineLife[] = [
  { id: "manta", name: "Manta rays", icon: "🪶" },
  { id: "whaleshark", name: "Whale sharks", icon: "🐋" },
  { id: "hammerhead", name: "Hammerheads", icon: "🔨" },
  { id: "greatwhite", name: "Great whites", icon: "🦈" },
  { id: "turtle", name: "Sea turtles", icon: "🐢" },
  { id: "mola", name: "Mola mola", icon: "🌕" },
  { id: "thresher", name: "Thresher sharks", icon: "🗡️" },
  { id: "reefshark", name: "Reef sharks", icon: "🐟" },
];

export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export type Destination = {
  slug: string;
  name: string;
  country: string;
  status: "peak" | "occasional";
  image: string;
  sightings: number;
  visibility: string;
  waterTemp: string;
  skill: string;
  avatars: string[];
  bestMonths: number[]; // 0-11 intensity 0-3 each (length 12)
  cost: string;
  whyParagraph: string;
  conditions: {
    waterTemp: string;
    visibility: string;
    current: string;
    surface: string;
  };
};

const AVATARS = [
  "https://i.pravatar.cc/80?img=12",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=45",
  "https://i.pravatar.cc/80?img=51",
  "https://i.pravatar.cc/80?img=23",
  "https://i.pravatar.cc/80?img=8",
  "https://i.pravatar.cc/80?img=27",
  "https://i.pravatar.cc/80?img=64",
];

export const DESTINATIONS: Destination[] = [
  {
    slug: "komodo",
    name: "Komodo",
    country: "Indonesia",
    status: "peak",
    image:
      "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=2000&q=80",
    sightings: 47,
    visibility: "25–30m",
    waterTemp: "27°C",
    skill: "Advanced+",
    avatars: AVATARS.slice(0, 4),
    bestMonths: [1, 1, 2, 2, 2, 3, 3, 3, 3, 2, 1, 1],
    cost: "$2,800–$4,500",
    whyParagraph:
      "September marks the peak of the dry season around Komodo's southern reefs. Cold, plankton-rich currents from the Indian Ocean funnel through Manta Alley, drawing oceanic manta rays in aggregations of fifteen or more. Visibility stretches to thirty meters and the water still holds tropical warmth — a narrow window where conditions, life, and light all align.",
    conditions: {
      waterTemp: "27°C",
      visibility: "25–30m",
      current: "Moderate to strong",
      surface: "Calm, light chop",
    },
  },
  {
    slug: "socorro",
    name: "Socorro",
    country: "Mexico",
    status: "peak",
    image:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=2000&q=80",
    sightings: 31,
    visibility: "30–40m",
    waterTemp: "26°C",
    skill: "Advanced+",
    avatars: AVATARS.slice(2, 6),
    bestMonths: [2, 2, 2, 1, 1, 0, 0, 1, 3, 3, 3, 2],
    cost: "$4,200–$6,800",
    whyParagraph:
      "Socorro's volcanic seamounts pull pelagic life from the open Pacific. September brings consistent encounters with giant Pacific mantas — often curious, always cinematic — alongside hammerhead schools and the occasional whale shark drifting through the blue.",
    conditions: {
      waterTemp: "26°C",
      visibility: "30–40m",
      current: "Strong, surge possible",
      surface: "Open ocean swell",
    },
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "South Ari Atoll",
    status: "occasional",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2000&q=80",
    sightings: 12,
    visibility: "20–25m",
    waterTemp: "29°C",
    skill: "All levels",
    avatars: AVATARS.slice(1, 5),
    bestMonths: [3, 3, 2, 2, 1, 1, 1, 2, 2, 2, 2, 3],
    cost: "$3,500–$5,200",
    whyParagraph:
      "South Ari shifts from peak season in winter to quieter waters in September, with occasional manta cleaning station activity. Whale sharks remain a year-round possibility along the atoll's southwestern fringe.",
    conditions: {
      waterTemp: "29°C",
      visibility: "20–25m",
      current: "Mild to moderate",
      surface: "Calm",
    },
  },
];

export type Sighting = {
  diver: string;
  avatar: string;
  saw: string;
  location: string;
  photo: string;
  ago: string;
};

export const SIGHTINGS: Sighting[] = [
  {
    diver: "Ana Beltrán",
    avatar: AVATARS[0],
    saw: "3 mantas, 1 reef shark",
    location: "Manta Alley, Komodo",
    photo:
      "https://images.unsplash.com/photo-1571687949921-1306bfb24b72?auto=format&fit=crop&w=600&q=80",
    ago: "2 days ago",
  },
  {
    diver: "Kenji Mori",
    avatar: AVATARS[1],
    saw: "Whale shark, juvenile",
    location: "Maamigili, Maldives",
    photo:
      "https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=600&q=80",
    ago: "4 days ago",
  },
  {
    diver: "Sofia Rinaldi",
    avatar: AVATARS[2],
    saw: "Hammerhead school (12+)",
    location: "Roca Partida, Socorro",
    photo:
      "https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?auto=format&fit=crop&w=600&q=80",
    ago: "5 days ago",
  },
  {
    diver: "Marcus Hale",
    avatar: AVATARS[3],
    saw: "2 mantas, sea turtle",
    location: "Karang Makassar, Komodo",
    photo:
      "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=600&q=80",
    ago: "1 week ago",
  },
  {
    diver: "Priya Anand",
    avatar: AVATARS[4],
    saw: "Thresher shark",
    location: "Monad Shoal, Malapascua",
    photo:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=600&q=80",
    ago: "1 week ago",
  },
];