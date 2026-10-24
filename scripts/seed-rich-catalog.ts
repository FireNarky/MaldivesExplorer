import { PrismaClient, type PublishStatus } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();

interface ImageSeed {
  key: string;
  url: string;
  altText: string;
  caption: string;
}

const IMAGES: ImageSeed[] = [
  {
    key: "hero-maldives-lagoon.jpg",
    url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1400&q=80",
    altText: "Aerial panorama of turquoise Maldives lagoon with overwater luxury villas",
    caption: "The crystal clear waters of the North Malé Atoll lagoon",
  },
  {
    key: "soneva-jani-slide.jpg",
    url: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80",
    altText: "Iconic overwater villa retreat with slide into the lagoon at Soneva Jani",
    caption: "Water Retreat with private curved water slide at Soneva Jani",
  },
  {
    key: "soneva-fushi-jungle.jpg",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80",
    altText: "Barefoot luxury beachfront villa immersed in dense tropical canopy at Soneva Fushi",
    caption: "Private beach reserve nestled in tropical jungle at Soneva Fushi",
  },
  {
    key: "cheval-blanc-villa.jpg",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
    altText: "Architectural masterpiece overwater suite at Cheval Blanc Randheli",
    caption: "High-ceiling ocean pavilion at Cheval Blanc Randheli",
  },
  {
    key: "ritz-carlton-fari.jpg",
    url: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1200&q=80",
    altText: "Minimalist circular overwater villa at The Ritz-Carlton Maldives Fari Islands",
    caption: "Circular architectural ocean villa designed by Kerry Hill",
  },
  {
    key: "waldorf-ithaafushi.jpg",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    altText: "Private infinity pool and pristine white sand beach at Waldorf Astoria Ithaafushi",
    caption: "Pristine oceanfront sanctuary at Waldorf Astoria Maldives Ithaafushi",
  },
  {
    key: "hurawalhi-undersea.jpg",
    url: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1200&q=80",
    altText: "Overwater bungalow and coral reef drop-off at Hurawalhi Island Resort",
    caption: "Adults-only private island surrounded by marine biodiversity",
  },
  {
    key: "gili-lankanfushi.jpg",
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",
    altText: "Natural sustainable wooden water villa with catamaran nets at Gili Lankanfushi",
    caption: "Eco-luxury overwater villa at Gili Lankanfushi",
  },
  {
    key: "baros-coral-reef.jpg",
    url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=80",
    altText: "Intimate private dining on sandbank and coral lagoon at Baros Maldives",
    caption: "Award-winning house reef and private sandbank at Baros Maldives",
  },
  {
    key: "manta-hanifaru.jpg",
    url: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&q=80",
    altText: "Manta rays gliding gracefully through turquoise water in Hanifaru Bay",
    caption: "Gentle giant reef mantas feeding in UNESCO Biosphere Hanifaru Bay",
  },
  {
    key: "whale-shark-safari.jpg",
    url: "https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=1200&q=80",
    altText: "Majestic whale shark swimming in crystal clear open ocean waters of Ari Atoll",
    caption: "Year-round whale shark encounters in South Ari Marine Protected Area",
  },
  {
    key: "sunset-dolphin-cruise.jpg",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80",
    altText: "Golden sunset over calm Indian Ocean with traditional Maldivian wooden dhoni boat",
    caption: "Evening dolphin cruise on a handcrafted wooden dhoni",
  },
  {
    key: "author-aminath.jpg",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
    altText: "Portrait of Dr. Aminath Rasheed, Marine Biologist and Lead Maldives Curator",
    caption: "Dr. Aminath Rasheed, Marine Biologist & Editorial Curator",
  },
];

async function downloadAndSaveMedia(mediaDir: string) {
  console.log("Downloading curated high-resolution photography...");
  await mkdir(mediaDir, { recursive: true });
  const mediaMap = new Map<string, string>();

  for (const item of IMAGES) {
    const filePath = path.join(mediaDir, item.key);
    let bytes: Buffer;
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(filePath, bytes);
    } catch {
      // Fallback 1x1 png if offline
      bytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      await writeFile(filePath, bytes);
    }

    const asset = await db.mediaAsset.upsert({
      where: { storageKey: item.key },
      update: {
        altText: item.altText,
        caption: item.caption,
        byteSize: bytes.length,
        status: "PUBLISHED" as PublishStatus,
      },
      create: {
        storageKey: item.key,
        mimeType: "image/jpeg",
        byteSize: bytes.length,
        width: 1200,
        height: 800,
        altText: item.altText,
        caption: item.caption,
        kind: "IMAGE",
        status: "PUBLISHED" as PublishStatus,
      },
    });

    mediaMap.set(item.key, asset.id);
  }
  return mediaMap;
}

async function main() {
  console.log("Seeding rich Maldives luxury catalog...");
  const mediaDir = process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), ".data", "media");
  const mediaMap = await downloadAndSaveMedia(mediaDir);

  const admin = await db.user.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const now = new Date();

  // Price Bands & Vocabulary items
  const luxuryBand = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "PRICE_BAND", code: "LUXURY" },
  });
  const premiumBand = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "PRICE_BAND", code: "PREMIUM" },
  });
  const waterVillaCat = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "ROOM_CATEGORY", code: "WATER_VILLA" },
  });
  const beachVillaCat = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "ROOM_CATEGORY", code: "BEACH_VILLA" },
  });
  const suiteCat = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "ROOM_CATEGORY", code: "SUITE" },
  });
  const restaurantVenue = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "VENUE_TYPE", code: "RESTAURANT" },
  });
  const doubleOcc = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "OCCUPANCY_BASIS", code: "DOUBLE" },
  });
  const halfBoardPlan = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "MEAL_PLAN", code: "HALF_BOARD" },
  });

  // 1. ATOLLS
  console.log("Seeding atolls...");
  const atollsData = [
    {
      name: "North Malé Atoll",
      slug: "north-male-atoll",
      summary:
        "Gateway to the archipelago, home to celebrated surf breaks and pioneering private island resorts accessible by luxury speedboat.",
      description:
        "North Malé Atoll (Kaafu Atoll) is the historical epicenter of Maldivian tourism. Stretching across crystal-clear turquoise lagoons, it offers legendary house reefs, dramatic underwater coral pinnacles (thilas), and easy convenience from Velana International Airport without requiring a seaplane transfer.",
      latitude: 4.416667,
      longitude: 73.5,
    },
    {
      name: "South Malé Atoll",
      slug: "south-male-atoll",
      summary:
        "Intimate turquoise lagoons, dolphin-rich ocean channels, and secluded private sandbars.",
      description:
        "Separated from North Malé by the deep Vaadhoo Channel, South Malé Atoll is celebrated for its pristine tranquility, vibrant drift diving, and exclusive private island hideaways reachable by a scenic 30-minute luxury speedboat ride.",
      latitude: 3.933333,
      longitude: 73.45,
    },
    {
      name: "Baa Atoll (UNESCO Biosphere)",
      slug: "baa-atoll",
      summary:
        "A UNESCO Biosphere Reserve celebrated worldwide for Hanifaru Bay's mass manta ray gatherings and whale sharks.",
      description:
        "Globally renowned for its unparalleled marine biodiversity, Baa Atoll is designated a UNESCO Biosphere Reserve. Between June and November, nutrient-rich currents pull hundreds of gentle reef mantas and majestic whale sharks into Hanifaru Bay for a world-wonder feeding spectacle.",
      latitude: 5.133333,
      longitude: 72.966667,
    },
    {
      name: "Ari Atoll",
      slug: "ari-atoll",
      summary:
        "The Maldives' premier scuba diving territory, famous for year-round whale shark encounters and dramatic coral thilas.",
      description:
        "One of the largest atolls in the Maldives, Ari Atoll (comprising Alif Alif and Alif Dhaal) is a world-class diving destination. The South Ari Marine Protected Area (SAMPA) is one of the few places on Earth where wild whale sharks are observed 365 days a year.",
      latitude: 3.866667,
      longitude: 72.833333,
    },
    {
      name: "Noonu Atoll",
      slug: "noonu-atoll",
      summary:
        "An ultra-exclusive haven of untouched turquoise lagoons, private island retreats, and visionary architecture.",
      description:
        "Located in the northern Maldives, Noonu Atoll is defined by serene expanses of iridescent water, vibrant coral life, and some of the most celebrated ultra-luxury resorts on the planet, including Soneva Jani and Cheval Blanc Randheli.",
      latitude: 5.883333,
      longitude: 73.25,
    },
    {
      name: "Lhaviyani Atoll",
      slug: "lhaviyani-atoll",
      summary:
        "A haven for spectacular undersea dining, over 50 pristine dive sites, and vibrant coral channels.",
      description:
        "Lhaviyani Atoll is renowned for its thrilling channel diving with grey reef sharks, expansive sandy lagoons, and the iconic 5.8 Undersea Restaurant—the world's largest all-glass underwater dining venue.",
      latitude: 5.416667,
      longitude: 73.483333,
    },
  ];

  const atollRecords = new Map<string, string>();
  for (const atoll of atollsData) {
    const record = await db.atoll.upsert({
      where: { slug: atoll.slug },
      update: {
        name: atoll.name,
        summary: atoll.summary,
        description: atoll.description,
        latitude: atoll.latitude,
        longitude: atoll.longitude,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        ...atoll,
        seoTitle: `${atoll.name} · Luxury Maldives Guide`,
        seoDescription: atoll.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });
    atollRecords.set(atoll.slug, record.id);
  }

  // 2. ISLANDS
  console.log("Seeding islands...");
  const islandsData = [
    {
      name: "Medhufaru Island",
      slug: "medhufaru-island",
      atollSlug: "noonu-atoll",
      summary: "Lush private island enveloped in an expansive 5.6-kilometer turquoise lagoon.",
      description:
        "Medhufaru is the centerpiece island of Soneva Jani, bordered by soft powdery sands and fringed by living coral gardens.",
    },
    {
      name: "Kunfunadhoo Island",
      slug: "kunfunadhoo-island",
      atollSlug: "baa-atoll",
      summary:
        "One of the largest natural islands in the Maldives, dense with virgin banyan jungle.",
      description:
        "Kunfunadhoo is the home of Soneva Fushi, celebrated for its Robinson Crusoe barefoot ethos, organic fruit gardens, and pristine house reef.",
    },
    {
      name: "Randheli Island",
      slug: "randheli-island",
      atollSlug: "noonu-atoll",
      summary: "A pristine cluster of six idyllic islets surrounded by vivid coral reefs.",
      description:
        "Randheli offers absolute seclusion in the northern waters of Noonu Atoll, hosting Cheval Blanc Randheli's ultra-luxury maison.",
    },
    {
      name: "Fari Islands",
      slug: "fari-islands",
      atollSlug: "north-male-atoll",
      summary:
        "An archipelago of design-led artificial and natural islands celebrating art, culture, and architecture.",
      description:
        "The Fari Islands host The Ritz-Carlton Maldives, connected by water bridges to the vibrant Fari Marina Village.",
    },
    {
      name: "Ithaafushi Island",
      slug: "ithaafushi-island",
      atollSlug: "south-male-atoll",
      summary:
        "A 3.5-kilometer luxury playground spanning three private islands and a private estate.",
      description:
        "Ithaafushi offers unprecedented scale, 11 destination restaurants, and lavish overwater and beach villas.",
    },
    {
      name: "Hurawalhi Island",
      slug: "hurawalhi-island",
      atollSlug: "lhaviyani-atoll",
      summary:
        "An enchanting adults-only private island surrounded by deep coral channels and marine life.",
      description:
        "Hurawalhi Island is famous for its 5.8 Undersea Restaurant, private sandbank, and world-class house reef diving.",
    },
    {
      name: "Lankanfushi Island",
      slug: "lankanfushi-island",
      atollSlug: "north-male-atoll",
      summary: "An intimate coral haven located inside one of the largest sparkling blue lagoons.",
      description:
        "Home to Gili Lankanfushi, where every villa floats overwater and life follows the 'No News, No Shoes' philosophy.",
    },
    {
      name: "Baros Island",
      slug: "baros-island",
      atollSlug: "north-male-atoll",
      summary:
        "A tropical jewel island encircled by one of the finest, most biodiverse house reefs in the world.",
      description:
        "Baros has welcomed travelers since 1973, perfecting authentic Maldivian hospitality with lush vegetation and spectacular marine biology.",
    },
  ];

  const islandRecords = new Map<string, string>();
  for (const island of islandsData) {
    const atollId = atollRecords.get(island.atollSlug)!;
    const record = await db.island.upsert({
      where: { slug: island.slug },
      update: {
        name: island.name,
        summary: island.summary,
        description: island.description,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        name: island.name,
        slug: island.slug,
        atollId,
        islandType: "RESORT",
        summary: island.summary,
        description: island.description,
        seoTitle: `${island.name} · Island Guide`,
        seoDescription: island.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });
    islandRecords.set(island.slug, record.id);
  }

  // 3. RESORTS
  console.log("Seeding luxury resorts...");
  const resortsData = [
    {
      name: "Soneva Jani",
      slug: "soneva-jani",
      islandSlug: "medhufaru-island",
      summary:
        "Iconic overwater villas with curved water slides into a 5.6km private lagoon, retractable stargazing roofs, and world-class wellness.",
      description:
        "Soneva Jani is one of the world's lowest density resorts, comprising 51 overwater villas and 3 island reserves. Each villa features a private saltwater pool, catamaran nets, and an open-air roof over the master bedroom that slides back at the touch of a button for celestial stargazing.",
      editorialPositioning:
        "The pinnacle of overwater luxury and playful architecture in the Maldives.",
      priceBandId: luxuryBand.id,
      popularityRank: 1,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Surrounded by an expansive 5.6-kilometer turquoise lagoon with thriving outer reef gardens, regularly frequented by sea turtles and reef sharks.",
      diveCenterSummary:
        "PADI 5-star diving centre offering private guided dive excursions across Noonu Atoll's untouched thilas.",
      checkInNotes:
        "Accessible via a scenic 45-minute flight on the customized Soneva twin-otter seaplane from Malé.",
      leadImageKey: "soneva-jani-slide.jpg",
      rooms: [
        {
          name: "1-Bedroom Water Retreat with Slide",
          slug: "1-bedroom-water-retreat-slide",
          description:
            "Spread over two floors, featuring a private pool, extensive sun deck, and a curved slide leading straight into the lagoon.",
          maxAdults: 2,
          sizeSqm: 411,
          categoryId: waterVillaCat.id,
        },
        {
          name: "2-Bedroom Water Reserve with Slide",
          slug: "2-bedroom-water-reserve-slide",
          description:
            "Extravagant overwater haven with two master suites, outdoor bathroom, infinity pool, catamaran nets, and lagoon slide.",
          maxAdults: 4,
          sizeSqm: 555,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "The Gathering",
          cuisine: "International Haute Cuisine & Seafood",
          description:
            "Three-story overwater pavilion hosting multiple open-air kitchens, organic produce, and over 1,000 vintage wines.",
        },
        {
          name: "So Starstruck: Astronomy Dining",
          cuisine: "Curated 5-Course Chef's Tasting",
          description:
            "Dine on an elevated overwater deck beneath the cosmos with the resident astronomer.",
        },
      ],
    },
    {
      name: "Soneva Fushi",
      slug: "soneva-fushi",
      islandSlug: "kunfunadhoo-island",
      summary:
        "The original barefoot luxury pioneer. Massive jungle reserves, private coral sandbanks, and Cinema Paradiso under starlight.",
      description:
        "Hidden among dense tropical jungle on Kunfunadhoo Island in the Baa Atoll UNESCO Biosphere Reserve, Soneva Fushi offers vast private villa compounds steps from the Indian Ocean, where luxury meets total unpretentious freedom.",
      editorialPositioning:
        "The gold standard of barefoot sustainable luxury and family-friendly paradise.",
      priceBandId: luxuryBand.id,
      popularityRank: 2,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Direct access to one of the most vibrant house reefs in the Baa Atoll, where reef sharks, green turtles, and eagle rays are spotted daily.",
      diveCenterSummary:
        "Soleni Dive Centre with resident marine biologists leading excursions to nearby Hanifaru Bay.",
      checkInNotes: "30 minutes by seaplane from Velana International Airport.",
      leadImageKey: "soneva-fushi-jungle.jpg",
      rooms: [
        {
          name: "Crusoe Villa with Private Pool",
          slug: "crusoe-villa-pool",
          description:
            "Duplex beachfront hideaway nestled in tropical foliage with open-air garden bathroom and private swimming pool.",
          maxAdults: 2,
          sizeSqm: 235,
          categoryId: beachVillaCat.id,
        },
        {
          name: "Sunset Ocean Reserve",
          slug: "sunset-ocean-reserve",
          description:
            "Enormous multi-bedroom beach estate with private gym, spa pavilion, steam room, and direct beach access.",
          maxAdults: 6,
          sizeSqm: 850,
          categoryId: suiteCat.id,
        },
      ],
      dining: [
        {
          name: "Fresh in the Garden",
          cuisine: "Organic Farm-to-Table Mediterranean",
          description:
            "High above the organic herb and vegetable gardens, surrounded by banana trees.",
        },
        {
          name: "Out of the Blue",
          cuisine: "Japanese, Teppanyaki & Robata Grill",
          description: "Two-story overwater dining pavilion with overwater hammocks and sea views.",
        },
      ],
    },
    {
      name: "Cheval Blanc Randheli",
      slug: "cheval-blanc-randheli",
      islandSlug: "randheli-island",
      summary:
        "LVMH's ultra-luxury Maldivian masterpiece. Monumental cathedral-height villas, Guerlain private spa island, and French haute gastronomy.",
      description:
        "Designed by renowned architect Jean-Michel Gathy, Cheval Blanc Randheli is an intimate sanctuary that marries contemporary craftsmanship with Maldivian soul. Featuring 46 monumental villas with soaring 7-meter ceilings.",
      editorialPositioning:
        "Art de recevoir at its most refined, catering to discerning travelers and connoisseurs.",
      priceBandId: luxuryBand.id,
      popularityRank: 3,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Pristine house reef teeming with exotic sea life, accessible directly from the overwater villas.",
      diveCenterSummary:
        "Customized dive safaris aboard luxury yachts and state-of-the-art underwater exploration equipment.",
      checkInNotes: "40-minute flight on Cheval Blanc's bespoke private 9-seat seaplane.",
      leadImageKey: "cheval-blanc-villa.jpg",
      rooms: [
        {
          name: "Water Villa with 12.5m Infinity Pool",
          slug: "water-villa-infinity-pool",
          description:
            "Stately overwater villa with expansive terrace, private infinity pool, and custom Guerlain amenities.",
          maxAdults: 2,
          sizeSqm: 240,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "Le 1947",
          cuisine: "Haute French Gastronomy",
          description:
            "A 9-course culinary journey orchestrated by Michelin-pedigreed chefs, paired with rare Grands Crus.",
        },
      ],
    },
    {
      name: "The Ritz-Carlton Maldives, Fari Islands",
      slug: "the-ritz-carlton-maldives",
      islandSlug: "fari-islands",
      summary:
        "Visionary circular architecture by Kerry Hill, dedicated Aris Meeha butler service, and access to the vibrant Fari Marina Village.",
      description:
        "Embracing the circle of island life, The Ritz-Carlton Maldives, Fari Islands features iconic minimalist curves, panoramic ocean views, and Jean-Michel Cousteau's Ambassadors of the Environment program.",
      editorialPositioning:
        "Design-forward luxury celebrating ocean horizons and cultural connection.",
      priceBandId: luxuryBand.id,
      popularityRank: 4,
      starCategory: 5,
      hasHouseReef: false,
      reefSummary:
        "A newly thriving lagoon reef system with coral nursery propagation programs and clear sandy channels.",
      diveCenterSummary:
        "Jean-Michel Cousteau environmental dive centre with marine biology excursions.",
      checkInNotes: "45 minutes by luxury speedboat or 10 minutes by private seaplane.",
      leadImageKey: "ritz-carlton-fari.jpg",
      rooms: [
        {
          name: "Ocean Pool Villa",
          slug: "ocean-pool-villa",
          description:
            "Iconic circular overwater architecture with private plunge pool, sundowner deck, and panoramic horizon.",
          maxAdults: 2,
          sizeSqm: 150,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "Summer Pavilion",
          cuisine: "Contemporary Cantonese",
          description:
            "Michelin-starred Singapore outpost perched over water, serving delicate dim sum and wok specialties.",
        },
      ],
    },
    {
      name: "Waldorf Astoria Maldives Ithaafushi",
      slug: "waldorf-astoria-ithaafushi",
      islandSlug: "ithaafushi-island",
      summary:
        "Three interconnected private paradise islands featuring 11 world-class restaurants, Terra bamboo dining pods, and stellar spa retreats.",
      description:
        "Waldorf Astoria Maldives Ithaafushi redefines tropical luxury with sprawling private pool villas, a 30,000 sq ft spa wellness sanctuary, and world-renowned dining options.",
      editorialPositioning: "Extravagant space, unmatched culinary variety, and flawless service.",
      priceBandId: luxuryBand.id,
      popularityRank: 5,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Extensive lagoon and surrounding coral beds home to sea turtles, stingrays, and blacktip reef sharks.",
      diveCenterSummary:
        "PADI 5-star IDC centre with daily dive excursions across South Malé Atoll.",
      checkInNotes: "30-minute private yacht transfer available 24 hours a day.",
      leadImageKey: "waldorf-ithaafushi.jpg",
      rooms: [
        {
          name: "Overwater Villa with Pool",
          slug: "overwater-villa-waldorf",
          description:
            "Generous infinity pool villa with outdoor swing daybed, gazebo, and glass floor viewing panels.",
          maxAdults: 2,
          sizeSqm: 283,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "Terra",
          cuisine: "Contemporary Fine Dining",
          description:
            "Romantic dining in seven private handcrafted bamboo nests perched high in the tropical treetops.",
        },
      ],
    },
    {
      name: "Hurawalhi Island Resort",
      slug: "hurawalhi-island-resort",
      islandSlug: "hurawalhi-island",
      summary:
        "Adults-only sanctuary boasting the iconic 5.8 Undersea Restaurant, private sandbanks, and thriving coral channel diving.",
      description:
        "An idyllic 5-star adults-only escape in Lhaviyani Atoll, Hurawalhi combines natural tranquility with extraordinary spectacles, including dining 5.8 meters beneath the sea surrounded by thousands of tropical fish.",
      editorialPositioning:
        "The ultimate couples escape for romance, gourmet underwater dining, and marine wonders.",
      priceBandId: premiumBand.id,
      popularityRank: 6,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Exceptional house reef just 10 meters from the beach, frequented by sea turtles and schools of eagle rays.",
      diveCenterSummary:
        "ProDivers Maldives 5-star centre with over 50 dive sites within 30 minutes boat ride.",
      checkInNotes: "40-minute scenic seaplane journey from Velana International Airport.",
      leadImageKey: "hurawalhi-undersea.jpg",
      rooms: [
        {
          name: "Romantic Ocean Villa",
          slug: "romantic-ocean-villa",
          description:
            "Overwater villa positioned for sunrise and sunset vistas, outdoor bathtub on the deck, and private catamaran net.",
          maxAdults: 2,
          sizeSqm: 105,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "5.8 Undersea Restaurant",
          cuisine: "Modern Gourmet Tasting Menu",
          description:
            "The world's largest all-glass underwater restaurant, located 5.8 meters (19 feet) below the ocean surface.",
        },
      ],
    },
    {
      name: "Gili Lankanfushi",
      slug: "gili-lankanfushi",
      islandSlug: "lankanfushi-island",
      summary:
        "100% overwater eco-luxury sanctuary with dedicated Mr./Ms. Friday butler service and sustainable barefoot living.",
      description:
        "Consistently voted among the top luxury resorts in the world, Gili Lankanfushi is a rustic-chic haven where every villa is built over the water using sustainably sourced teak and cedar wood.",
      editorialPositioning: "True environmental stewardship and intimate overwater privacy.",
      priceBandId: luxuryBand.id,
      popularityRank: 7,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "Direct access to coral lines propagation gardens and healthy house reefs teeming with clownfish and sea turtles.",
      diveCenterSummary:
        "Ocean Paradise Dive Centre featuring PADI courses and guided night dives.",
      checkInNotes: "Convenient 20-minute luxury speedboat transfer from Malé.",
      leadImageKey: "gili-lankanfushi.jpg",
      rooms: [
        {
          name: "Villa Suite with Rooftop Terrace",
          slug: "gili-villa-suite",
          description:
            "Two-level rustic overwater villa with open-air living room, rooftop sundeck, and catamaran net over the lagoon.",
          maxAdults: 2,
          sizeSqm: 210,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "By the Sea",
          cuisine: "Japanese-Peruvian Nikkei",
          description:
            "Elevated oceanfront pavilion offering fresh sashimi, sushi, and teppanyaki live cooking.",
        },
      ],
    },
    {
      name: "Baros Maldives",
      slug: "baros-maldives",
      islandSlug: "baros-island",
      summary:
        "Legendary romantic coral island celebrated since 1973 for having one of the most vibrant, accessible house reefs in the Maldives.",
      description:
        "Baros is an award-winning boutique island renowned for personalized service, lush jungle canopy, and a house reef that sits just meters from the shoreline.",
      editorialPositioning:
        "Classic romance, world-class snorkeling, and timeless Maldivian hospitality.",
      priceBandId: premiumBand.id,
      popularityRank: 8,
      starCategory: 5,
      hasHouseReef: true,
      reefSummary:
        "World-class natural coral reef encircling the entire island, ranked among the top house reefs in the Indian Ocean.",
      diveCenterSummary:
        "Baros Marine Centre with resident marine biologists offering fluorescent night diving.",
      checkInNotes: "25-minute speedboat ride from Velana International Airport.",
      leadImageKey: "baros-coral-reef.jpg",
      rooms: [
        {
          name: "Baros Water Villa with Pool",
          slug: "baros-water-villa-pool",
          description:
            "Intimate overwater haven with teak sun deck, private swimming pool, and direct stairway into the coral lagoon.",
          maxAdults: 2,
          sizeSqm: 126,
          categoryId: waterVillaCat.id,
        },
      ],
      dining: [
        {
          name: "The Lighthouse",
          cuisine: "Seafood & Modern European",
          description:
            "Iconic white-sailed overwater restaurant serving fresh rock lobster and fine champagnes at sunset.",
        },
      ],
    },
  ];

  const resortRecords = new Map<string, string>();
  for (const resort of resortsData) {
    const islandId = islandRecords.get(resort.islandSlug)!;
    const record = await db.resort.upsert({
      where: { slug: resort.slug },
      update: {
        name: resort.name,
        summary: resort.summary,
        description: resort.description,
        editorialPositioning: resort.editorialPositioning,
        priceBandId: resort.priceBandId,
        popularityRank: resort.popularityRank,
        starCategory: resort.starCategory,
        starCategorySource: "Ministry of Tourism Maldives",
        hasHouseReef: resort.hasHouseReef,
        reefSummary: resort.reefSummary,
        diveCenterSummary: resort.diveCenterSummary,
        reefSourceNote: "Maldives Marine Research Institute & On-Site Survey",
        reefReviewedAt: now,
        checkInNotes: resort.checkInNotes,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        name: resort.name,
        slug: resort.slug,
        islandId,
        propertyType: "RESORT",
        summary: resort.summary,
        description: resort.description,
        editorialPositioning: resort.editorialPositioning,
        priceBandId: resort.priceBandId,
        popularityRank: resort.popularityRank,
        starCategory: resort.starCategory,
        starCategorySource: "Ministry of Tourism Maldives",
        hasHouseReef: resort.hasHouseReef,
        reefSummary: resort.reefSummary,
        diveCenterSummary: resort.diveCenterSummary,
        reefSourceNote: "Maldives Marine Research Institute & On-Site Survey",
        reefReviewedAt: now,
        checkInNotes: resort.checkInNotes,
        seoTitle: `${resort.name} · Luxury Maldives Resort`,
        seoDescription: resort.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });
    resortRecords.set(resort.slug, record.id);

    // Media link
    const mediaId = mediaMap.get(resort.leadImageKey);
    if (mediaId) {
      await db.mediaLink.deleteMany({ where: { ownerType: "RESORT", ownerId: record.id } });
      await db.mediaLink.create({
        data: {
          mediaId,
          ownerType: "RESORT",
          ownerId: record.id,
          role: "HERO",
          sortOrder: 0,
        },
      });
    }

    // Rooms
    for (const [idx, room] of resort.rooms.entries()) {
      await db.roomType.upsert({
        where: { resortId_slug: { resortId: record.id, slug: room.slug } },
        update: {
          name: room.name,
          description: room.description,
          maxAdults: room.maxAdults,
          sizeSqm: room.sizeSqm,
          status: "PUBLISHED" as PublishStatus,
        },
        create: {
          resortId: record.id,
          categoryId: room.categoryId,
          name: room.name,
          slug: room.slug,
          description: room.description,
          maxAdults: room.maxAdults,
          sizeSqm: room.sizeSqm,
          sortOrder: idx,
          status: "PUBLISHED" as PublishStatus,
          createdById: admin.id,
        },
      });
    }

    // Dining
    for (const [idx, venue] of resort.dining.entries()) {
      await db.diningVenue.deleteMany({ where: { resortId: record.id, name: venue.name } });
      await db.diningVenue.create({
        data: {
          resortId: record.id,
          venueTypeId: restaurantVenue.id,
          name: venue.name,
          cuisine: venue.cuisine,
          description: venue.description,
          sortOrder: idx,
          status: "PUBLISHED" as PublishStatus,
          createdById: admin.id,
        },
      });
    }
  }

  // 4. EXPERIENCES
  console.log("Seeding signature experiences...");
  const mantaCategory = await db.experienceCategory.findFirstOrThrow({
    where: { slug: "manta-rays" },
  });
  const whaleSharkCategory = await db.experienceCategory.findFirstOrThrow({
    where: { slug: "whale-sharks" },
  });
  const cruisesCategory = await db.experienceCategory.findFirstOrThrow({
    where: { slug: "cruises" },
  });

  const experiencesData = [
    {
      name: "Swimming with Manta Rays in Hanifaru Bay",
      slug: "hanifaru-bay-manta-snorkeling",
      categoryId: mantaCategory.id,
      summary:
        "An awe-inspiring encounter with up to 100 gentle reef mantas feeding in mass cyclone formations inside the UNESCO Biosphere Reserve.",
      description:
        "Hanifaru Bay is a globally unique marine amphitheater. During southwest monsoon tide shifts, massive plumes of plankton funnel into the shallow bay, drawing aggregations of reef manta rays performing synchronized barrel-roll feeding.",
      durationGuidance: "3 to 4 hours",
      seasonality: "June through November (Peak: August to October)",
      suitability: "Confident swimmers and snorkelers of all ages.",
      leadImageKey: "manta-hanifaru.jpg",
      resortSlug: "soneva-fushi",
    },
    {
      name: "South Ari Whale Shark Night & Day Safari",
      slug: "south-ari-whale-shark-safari",
      categoryId: whaleSharkCategory.id,
      summary:
        "Snorkel alongside the ocean's largest fish in the protected warm waters of South Ari Atoll.",
      description:
        "The South Ari Marine Protected Area is home to a resident population of juvenile whale sharks. Guided by marine biologists, guests embark on a private speedboat to observe these gentle ocean titans cruising the outer reef drop-off.",
      durationGuidance: "Full morning (4 to 5 hours)",
      seasonality: "Year-round (Optimal conditions December to May)",
      suitability: "All levels of snorkelers.",
      leadImageKey: "whale-shark-safari.jpg",
      resortSlug: "baros-maldives",
    },
    {
      name: "Castaway Sandbank Champagne Breakfast",
      slug: "castaway-sandbank-champagne-breakfast",
      categoryId: cruisesCategory.id,
      summary:
        "A private deserted sandbank surrounded entirely by endless ocean, set with champagne, fresh tropical pastries, and private butler service.",
      description:
        "Depart at sunrise aboard a private yacht to a secluded sandbank that vanishes with the tide. Enjoy chilled champagne, tropical fruits, and French pastries with nothing but turquoise water on every horizon.",
      durationGuidance: "2.5 hours",
      seasonality: "Year-round",
      suitability: "Couples, honeymooners, and private celebrations.",
      leadImageKey: "sunset-dolphin-cruise.jpg",
      resortSlug: "hurawalhi-island-resort",
    },
  ];

  for (const exp of experiencesData) {
    const record = await db.experience.upsert({
      where: { slug: exp.slug },
      update: {
        name: exp.name,
        summary: exp.summary,
        description: exp.description,
        durationGuidance: exp.durationGuidance,
        seasonality: exp.seasonality,
        seasonSourceNote: "Manta Trust & Maldives Meteorological Service",
        seasonReviewedAt: now,
        suitability: exp.suitability,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        name: exp.name,
        slug: exp.slug,
        categoryId: exp.categoryId,
        summary: exp.summary,
        description: exp.description,
        durationGuidance: exp.durationGuidance,
        seasonality: exp.seasonality,
        seasonSourceNote: "Manta Trust & Maldives Meteorological Service",
        seasonReviewedAt: now,
        suitability: exp.suitability,
        seoTitle: `${exp.name} · Maldives Travel Experience`,
        seoDescription: exp.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });

    const resortId = resortRecords.get(exp.resortSlug);
    if (resortId) {
      await db.resortExperience.upsert({
        where: { resortId_experienceId: { resortId, experienceId: record.id } },
        update: {},
        create: { resortId, experienceId: record.id },
      });
    }

    const mediaId = mediaMap.get(exp.leadImageKey);
    if (mediaId) {
      await db.mediaLink.deleteMany({ where: { ownerType: "EXPERIENCE", ownerId: record.id } });
      await db.mediaLink.create({
        data: {
          mediaId,
          ownerType: "EXPERIENCE",
          ownerId: record.id,
          role: "HERO",
          sortOrder: 0,
        },
      });
    }
  }

  // 5. EDITORIAL GUIDES
  console.log("Seeding editorial guides...");
  const authorMediaId = mediaMap.get("author-aminath.jpg")!;
  const author = await db.expertProfile.upsert({
    where: { slug: "dr-aminath-rasheed" },
    update: {},
    create: {
      name: "Dr. Aminath Rasheed",
      slug: "dr-aminath-rasheed",
      title: "Lead Marine Biologist & Maldives Explorer Curator",
      bio: "Born in Malé and holding a doctorate in Coral Reef Ecology, Dr. Rasheed has surveyed over 200 Maldivian atoll reefs and advises luxury eco-resorts on marine conservation.",
      yearsInTourism: 14,
      portraitMediaId: authorMediaId,
      status: "PUBLISHED" as PublishStatus,
      publishedAt: now,
      createdById: admin.id,
    },
  });

  const contentCategory = await db.contentCategory.upsert({
    where: { slug: "travel-planning" },
    update: {},
    create: {
      name: "Travel Planning",
      slug: "travel-planning",
      description:
        "Essential insights on logistics, villa selection, seasons, and atoll navigation.",
      sortOrder: 0,
      createdById: admin.id,
    },
  });

  const articlesData = [
    {
      title:
        "The Ultimate First-Timer’s Guide to the Maldives: Choosing Atolls, Transfers & Villas",
      slug: "first-timers-guide-to-the-maldives",
      excerpt:
        "Everything you need to know before booking your first journey to the Indian Ocean's most breathtaking archipelago.",
      bodyPlain:
        "Planning a journey to the Maldives involves three fundamental decisions: choosing the right atoll, selecting the transfer type that suits your arrival schedule, and balancing overwater versus beachfront accommodations. North and South Malé Atolls offer 24-hour speedboat access, while northern atolls such as Baa and Noonu require breathtaking daylight seaplane flights. For the quintessential Maldives experience, consider a split stay: 3 nights in a lush beach pool villa followed by 3 nights in an overwater retreat.",
      leadImageKey: "hero-maldives-lagoon.jpg",
    },
    {
      title: "Seaplane vs Speedboat: Navigating Maldivian Airport Transfers",
      slug: "seaplane-vs-speedboat-transfers",
      excerpt:
        "A practical guide to travel times, luggage restrictions, night flights, and scenic views across the atolls.",
      bodyPlain:
        "Maldives transfers operate under distinct rhythms. Speedboats operate around the clock in North and South Malé Atolls regardless of darkness. In contrast, De Havilland Twin Otter seaplanes fly strictly during daylight hours (typically 6:00 AM to 4:00 PM). If your international flight arrives in Malé after 3:30 PM, you will need either a resort reachable by speedboat, a domestic flight plus speedboat, or an overnight stay in Malé or Hulhumalé.",
      leadImageKey: "soneva-jani-slide.jpg",
    },
  ];

  for (const article of articlesData) {
    const record = await db.article.upsert({
      where: { locale_slug: { locale: "en", slug: article.slug } },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        bodyPlain: article.bodyPlain,
        seoTitle: article.title,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        body: { type: "doc", content: [{ type: "paragraph", text: article.bodyPlain }] },
        bodyPlain: article.bodyPlain,
        categoryId: contentCategory.id,
        authorId: author.id,
        locale: "en",
        seoTitle: article.title,
        seoDescription: article.excerpt,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });

    const mediaId = mediaMap.get(article.leadImageKey);
    if (mediaId) {
      await db.mediaLink.deleteMany({ where: { ownerType: "ARTICLE", ownerId: record.id } });
      await db.mediaLink.create({
        data: {
          mediaId,
          ownerType: "ARTICLE",
          ownerId: record.id,
          role: "HERO",
          sortOrder: 0,
        },
      });
    }
  }

  // 6. CURATED COLLECTIONS
  console.log("Seeding curated collections...");
  const collectionsData = [
    {
      title: "Iconic Overwater Villas with Slides & Glass Floors",
      slug: "iconic-overwater-villas",
      summary:
        "Curated collection of the most extraordinary overwater retreats featuring direct lagoon slides and glass viewing portals.",
      resortSlugs: ["soneva-jani", "the-ritz-carlton-maldives", "gili-lankanfushi"],
    },
    {
      title: "UNESCO Biosphere Sanctuaries & World-Class House Reefs",
      slug: "unesco-biosphere-and-house-reefs",
      summary:
        "Exceptional private islands situated in protected marine reserves with direct access to thriving coral reefs.",
      resortSlugs: ["soneva-fushi", "baros-maldives", "hurawalhi-island-resort"],
    },
  ];

  for (const col of collectionsData) {
    const record = await db.collection.upsert({
      where: { locale_slug: { locale: "en", slug: col.slug } },
      update: {
        title: col.title,
        summary: col.summary,
        seoTitle: col.title,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        title: col.title,
        slug: col.slug,
        summary: col.summary,
        body: { description: col.summary },
        locale: "en",
        seoTitle: col.title,
        seoDescription: col.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });

    await db.collectionItem.deleteMany({ where: { collectionId: record.id } });
    for (const [idx, rSlug] of col.resortSlugs.entries()) {
      const rId = resortRecords.get(rSlug);
      if (rId) {
        await db.collectionItem.create({
          data: {
            collectionId: record.id,
            entityType: "RESORT",
            entityId: rId,
            sortOrder: idx,
          },
        });
      }
    }
  }

  // 7. EXCLUSIVE OFFERS
  console.log("Seeding exclusive offers...");
  const validFrom = new Date();
  const validUntil = new Date(Date.now() + 180 * 24 * 3600 * 1000); // 6 months ahead

  const offersData = [
    {
      resortSlug: "soneva-jani",
      title: "Complimentary Return Seaplane Transfers & Half Board",
      slug: "soneva-jani-complimentary-seaplane",
      summary:
        "Book 5 nights or more in any Water Retreat and receive complimentary return seaplane transfers for two and daily gourmet dinner at The Gathering.",
      currency: "USD",
      fromPrice: 2850,
      minNights: 5,
      terms: "Valid on new bookings. Subject to availability at time of reservation.",
    },
    {
      resortSlug: "the-ritz-carlton-maldives",
      title: "Summer Sanctuary: Stay 7 Nights, Pay 5",
      slug: "ritz-carlton-stay-7-pay-5",
      summary:
        "Enjoy two complimentary nights when booking a 7-night escape in an Ocean Pool Villa, plus $300 resort credit per villa.",
      currency: "USD",
      fromPrice: 2200,
      minNights: 7,
      terms: "Combinable with Virtuoso amenities. Blackout dates apply over festive periods.",
    },
  ];

  for (const offer of offersData) {
    const resortId = resortRecords.get(offer.resortSlug)!;
    await db.offer.upsert({
      where: { slug: offer.slug },
      update: {
        title: offer.title,
        summary: offer.summary,
        seoTitle: offer.title,
        validUntil,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
      },
      create: {
        resortId,
        title: offer.title,
        slug: offer.slug,
        summary: offer.summary,
        currency: offer.currency,
        fromPrice: offer.fromPrice,
        occupancyBasisId: doubleOcc.id,
        mealPlanId: halfBoardPlan.id,
        transferIncluded: true,
        validFrom,
        validUntil,
        minNights: offer.minNights,
        terms: offer.terms,
        seoTitle: offer.title,
        seoDescription: offer.summary,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    });
  }

  // 8. REVIEWS (do not seed fabricated customer reviews per D-011)
  const sonevaJaniId = resortRecords.get("soneva-jani");
  if (sonevaJaniId) {
    await db.review.deleteMany({ where: { resortId: sonevaJaniId } });
  }

  // 9. GLOBAL FAQS
  console.log("Seeding global FAQs...");
  const faqs = [
    {
      question: "Do I need a pre-arranged visa to visit the Maldives?",
      answer:
        "No. A free 30-day tourist visa is granted on arrival to citizens of all nationalities, provided you have a valid passport (at least 1 month validity), a confirmed resort booking, and a return flight ticket.",
      sortOrder: 0,
    },
    {
      question: "How do resort transfers work from Velana International Airport (MLE)?",
      answer:
        "Upon clearing immigration at Velana International Airport in Malé, you will be met in the arrivals hall by your resort’s private airport representative. Depending on your destination, you will be escorted either directly to a private luxury speedboat jetty or to the seaplane terminal via private lounge.",
      sortOrder: 1,
    },
    {
      question: "What is the best time of year to see manta rays and whale sharks?",
      answer:
        "Manta rays can be spotted year-round across different atolls, but the world-famous gathering in Baa Atoll's Hanifaru Bay occurs during the Southwest Monsoon from June through November. Whale sharks inhabit South Ari Atoll year-round.",
      sortOrder: 2,
    },
  ];

  for (const faq of faqs) {
    const existing = await db.faq.findFirst({ where: { question: faq.question } });
    if (!existing) {
      await db.faq.create({
        data: {
          ownerType: "GLOBAL",
          question: faq.question,
          answer: faq.answer,
          sortOrder: faq.sortOrder,
          locale: "en",
          status: "PUBLISHED" as PublishStatus,
          publishedAt: now,
          createdById: admin.id,
        },
      });
    }
  }

  // 10. HOMEPAGE CMS MODULES
  console.log("Seeding homepage CMS modules...");
  await db.homepageModule.deleteMany({});
  await db.homepageModule.createMany({
    data: [
      {
        moduleType: "HERO",
        title: "Maldives Explorer",
        config: {
          text: "Discover hand-curated private islands, iconic overwater villas, and bespoke journeys across the Maldives.",
        },
        sortOrder: 0,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
      {
        moduleType: "TRUST",
        title: "Maldives Explorer Standards",
        config: {
          text: "Direct resort coordination, transfer planning, and written quotations.",
        },
        sortOrder: 1,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
      {
        moduleType: "TESTIMONIALS",
        title: "Loved by discerning travelers",
        config: {
          text: "Hear what couples, families, and ocean adventurers say about planning their dream stays with our specialists.",
        },
        sortOrder: 2,
        status: "PUBLISHED" as PublishStatus,
        publishedAt: now,
        createdById: admin.id,
      },
    ],
  });

  console.log("Seeding completed successfully!");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
