"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Plane,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
  Compass,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapResort {
  id: string;
  name: string;
  slug: string;
  atoll: string;
  lat: number;
  lng: number;
  transferType: "Seaplane" | "Speedboat" | "Yacht";
  transferDuration: string;
  transferSummary?: string | null;
  highlights: string[];
  vibe: string;
  summary: string;
  tag: string;
  priceNote?: string;
  color: string;
  featured?: boolean;
}

export const RESORTS_DATA: MapResort[] = [
  {
    id: "soneva-jani",
    name: "Soneva Jani",
    slug: "soneva-jani",
    atoll: "Noonu Atoll",
    lat: 5.9221,
    lng: 73.2842,
    transferType: "Seaplane",
    transferDuration: "35 min TMA Seaplane",
    transferSummary: null,
    highlights: ["Overwater Slide into Lagoon", "Retractable Stargazing Roof", "5.6km Private Lagoon"],
    vibe: "Iconic Whimsical Ultra-Luxury",
    summary: "Renowned for its massive multi-bedroom overwater villas featuring curved slides directly into the turquoise lagoon.",
    tag: "Lagoon Slide Pioneer",
    color: "#06b6d4",
    featured: true,
  },
  {
    id: "soneva-fushi",
    name: "Soneva Fushi",
    slug: "soneva-fushi",
    atoll: "Baa Atoll (UNESCO Biosphere)",
    lat: 5.1119,
    lng: 73.0801,
    transferType: "Seaplane",
    transferDuration: "30 min TMA Seaplane",
    transferSummary: null,
    highlights: ["Hanifaru Bay Manta Snorkeling", "Barefoot Jungle Living", "Cinema Paradiso Under Stars"],
    vibe: "Original Barefoot Luxury",
    summary: "Dense jungle foliage meets crystalline waters in the heart of the UNESCO marine biosphere.",
    tag: "UNESCO Biosphere",
    color: "#10b981",
    featured: true,
  },
  {
    id: "cheval-blanc-randheli",
    name: "Cheval Blanc Randheli",
    slug: "cheval-blanc-randheli",
    atoll: "Noonu Atoll",
    lat: 5.7917,
    lng: 73.3421,
    transferType: "Seaplane",
    transferDuration: "40 min Maison Seaplane",
    transferSummary: null,
    highlights: ["Jean-Michel Gathy Architecture", "Guerlain Spa Island", "Le 1947 Fine Dining"],
    vibe: "Haute Couture Parisian Artistry",
    summary: "An exclusive LVMH Maison sanctuary showcasing soaring 7-meter cathedral doors and private island spa treatments.",
    tag: "LVMH Hospitality",
    color: "#eab308",
  },
  {
    id: "the-ritz-carlton-fari-islands",
    name: "The Ritz-Carlton Maldives",
    slug: "the-ritz-carlton-maldives",
    atoll: "North Malé Atoll (Fari Islands)",
    lat: 4.5933,
    lng: 73.5822,
    transferType: "Speedboat",
    transferDuration: "45 min Luxury Yacht",
    transferSummary: null,
    highlights: ["Kerry Hill Circular Architecture", "Aris Meeha Butler Service", "Fari Marina Village Access"],
    vibe: "Minimalist Modern Masterpiece",
    summary: "Spherical overwater villas inspired by ocean breezes and circular flows in the archipelago's cultural archipelago.",
    tag: "Architectural Icon",
    color: "#38bdf8",
  },
  {
    id: "waldorf-astoria-ithaafushi",
    name: "Waldorf Astoria Ithaafushi",
    slug: "waldorf-astoria-ithaafushi",
    atoll: "South Malé Atoll",
    lat: 3.9514,
    lng: 73.4021,
    transferType: "Yacht",
    transferDuration: "40 min Private Yacht",
    transferSummary: null,
    highlights: ["Terra Treetop Bamboo Pods", "11 Celebrated Restaurants", "Stella Maris Ocean Villas"],
    vibe: "Expansive Multi-Island Grandeur",
    summary: "Spanning three idyllic private islands with bespoke dining pods elevated in the canopy and standalone ocean villas.",
    tag: "Multi-Island Sanctuary",
    color: "#818cf8",
  },
  {
    id: "hurawalhi-island-resort",
    name: "Hurawalhi Island Resort",
    slug: "hurawalhi-island-resort",
    atoll: "Lhaviyani Atoll",
    lat: 5.5244,
    lng: 73.4429,
    transferType: "Seaplane",
    transferDuration: "40 min TMA Seaplane",
    transferSummary: null,
    highlights: ["5.8 Undersea Restaurant", "Adults-Only Tranquility", "Abundant Sea Turtle Reef"],
    vibe: "Romantic Ocean Epicurean",
    summary: "Home to the world's largest all-glass underwater restaurant, 5.8 meters beneath the surface of the lagoon.",
    tag: "Undersea Dining",
    color: "#f43f5e",
  },
  {
    id: "gili-lankanfushi",
    name: "Gili Lankanfushi",
    slug: "gili-lankanfushi",
    atoll: "North Malé Atoll",
    lat: 4.2936,
    lng: 73.5552,
    transferType: "Speedboat",
    transferDuration: "20 min Luxury Speedboat",
    transferSummary: null,
    highlights: ["100% Overwater Living", "Dedicated Mr. Friday Butler", "The Private Reserve Standalone Villa"],
    vibe: "No News, No Shoes Sustainability",
    summary: "An eco-luxury sanctuary of hand-crafted rustic wooden palaces built entirely over shimmering crystalline lagoons.",
    tag: "100% Overwater",
    color: "#14b8a6",
  },
  {
    id: "baros-maldives",
    name: "Baros Maldives",
    slug: "baros-maldives",
    atoll: "North Malé Atoll",
    lat: 4.2842,
    lng: 73.4278,
    transferType: "Speedboat",
    transferDuration: "25 min Speedboat",
    transferSummary: null,
    highlights: ["Legendary Living House Reef", "Piano Deck in the Lagoon", "Maldivian Hospitality Since 1973"],
    vibe: "Intimate Classic Romance",
    summary: "Celebrated worldwide for over fifty years for possessing one of the most vibrant, teeming house reefs reachable directly from shore.",
    tag: "World-Class House Reef",
    color: "#fb923c",
  },
  {
    id: "lux-south-ari-atoll",
    name: "LUX* South Ari Atoll",
    slug: "lux-south-ari-atoll",
    atoll: "Ari Atoll",
    lat: 3.4939,
    lng: 72.8833,
    transferType: "Seaplane",
    transferDuration: "25 min TMA Seaplane",
    transferSummary: null,
    highlights: ["Whale Shark Marine Protected Area", "4km Powdery White Beaches", "50+ Dive Sites"],
    vibe: "Vibrant Barefoot Marine Sanctuary",
    summary: "Perched along 4km of pristine white beaches in the premier whale shark sanctuary of the Maldives.",
    tag: "Whale Shark Sanctuary",
    color: "#f59e0b",
    featured: true,
  },
];

/**
 * Boat transfer channels from MLE, traced through open water between islands and reefs
 * (computed from the satellite imagery) so boats never cross land.
 */
const BOAT_ROUTES: Record<string, [number, number][]> = {
  "the-ritz-carlton-fari-islands": [[73.5291, 4.192], [73.5126, 4.2283], [73.4961, 4.2639], [73.4989, 4.3166], [73.5442, 4.5104], [73.5593, 4.5371], [73.5765, 4.587], [73.582, 4.5932]],
  "waldorf-astoria-ithaafushi": [[73.5291, 4.192], [73.5078, 4.1852], [73.4501, 4.1228], [73.4391, 4.0523], [73.4124, 4.0208], [73.4034, 3.979], [73.4027, 3.953], [73.4021, 3.9516]],
  "gili-lankanfushi": [[73.5291, 4.192], [73.5483, 4.1954], [73.56, 4.2146], [73.5559, 4.268], [73.5511, 4.2879], [73.5552, 4.2933]],
  "baros-maldives": [[73.5291, 4.192], [73.4845, 4.2358], [73.4275, 4.2844]],
};

const SEAPLANE_SVG = `<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="sp-body" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f3f6f8"/><stop offset="1" stop-color="#aebbc6"/></linearGradient>
    <linearGradient id="sp-float" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#dfe7ec"/><stop offset="1" stop-color="#8d9ca8"/></linearGradient>
    <linearGradient id="sp-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef2f5"/><stop offset="1" stop-color="#b4c1cc"/></linearGradient>
    <linearGradient id="sp-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b7f9e"/><stop offset=".5" stop-color="#0a2342"/><stop offset="1" stop-color="#14304f"/></linearGradient>
    <linearGradient id="sp-nac" x1="0" x2="1"><stop offset="0" stop-color="#f6f8fa"/><stop offset="1" stop-color="#9aa9b5"/></linearGradient>
    <radialGradient id="sp-hub"><stop offset="0" stop-color="#e2b65c"/><stop offset="1" stop-color="#8a6a25"/></radialGradient>
  </defs>
  <!-- floats -->
  <g stroke="#7d8c98" stroke-width=".5">
    <path d="M36 24 C40 24 41 30 41 36 L41 94 C41 99 39.5 102 36 102 C32.5 102 31 99 31 94 L31 36 C31 30 32 24 36 24Z" fill="url(#sp-float)"/>
    <path d="M84 24 C88 24 89 30 89 36 L89 94 C89 99 87.5 102 84 102 C80.5 102 79 99 79 94 L79 36 C79 30 80 24 84 24Z" fill="url(#sp-float)"/>
  </g>
  <g stroke="#5f6e7a" stroke-width="1.1" stroke-linecap="round">
    <path d="M52 42 L38 34 M52 52 L38 66 M68 42 L82 34 M68 52 L82 66"/>
  </g>
  <path d="M33 40 H39 M81 40 H87" stroke="#c9d3da" stroke-width="2" opacity=".9"/>
  <!-- tailplane -->
  <path d="M42 91 Q60 87 78 91 L77 101 Q60 98 43 101Z" fill="url(#sp-wing)" stroke="#9fb0bd" stroke-width=".5"/>
  <path d="M43 98 Q60 95 77 98" stroke="#c9d3da" stroke-width=".6" fill="none"/>
  <!-- main wing -->
  <path d="M3 44 Q3 38 10 38 L110 38 Q117 38 117 44 L117 50 Q117 56 110 56 L10 56 Q3 56 3 50Z" fill="url(#sp-wing)" stroke="#9fb0bd" stroke-width=".6"/>
  <path d="M10 38.4 L110 38.4" stroke="#fff" stroke-width="1.4" opacity=".9"/>
  <path d="M10 53 L110 53 M10 47 L110 47" stroke="#b9c6d0" stroke-width=".5" opacity=".8"/>
  <path d="M26 38 V56 M94 38 V56 M44 38 V56 M76 38 V56" stroke="#c4cfd8" stroke-width=".5"/>
  <path d="M3 44 Q3 38 10 38 L16 38 L16 56 L10 56 Q3 56 3 50Z" fill="#f2694b"/>
  <path d="M117 44 Q117 38 110 38 L104 38 L104 56 L110 56 Q117 56 117 50Z" fill="#f2694b"/>
  <rect x="16" y="45.8" width="88" height="1.6" fill="#0a2342" opacity=".8"/>
  <circle cx="4.5" cy="47" r="1.6" fill="#ff4d4d"/><circle cx="115.5" cy="47" r="1.6" fill="#35d07f"/>
  <!-- engines -->
  <g>
    <path d="M26 22 Q30 19 34 22 L35 50 L25 50Z" fill="url(#sp-nac)" stroke="#8d9ca8" stroke-width=".5"/>
    <path d="M86 22 Q90 19 94 22 L95 50 L85 50Z" fill="url(#sp-nac)" stroke="#8d9ca8" stroke-width=".5"/>
    <circle cx="30" cy="21" r="2" fill="url(#sp-hub)"/><circle cx="90" cy="21" r="2" fill="url(#sp-hub)"/>
    <g><ellipse cx="30" cy="21" rx="13" ry="1.4" fill="#0a2342" opacity=".28"><animateTransform attributeName="transform" type="rotate" from="0 30 21" to="360 30 21" dur=".1s" repeatCount="indefinite"/></ellipse>
    <circle cx="30" cy="21" r="12.5" fill="#0a2342" opacity=".06"/></g>
    <g><ellipse cx="90" cy="21" rx="13" ry="1.4" fill="#0a2342" opacity=".28"><animateTransform attributeName="transform" type="rotate" from="0 90 21" to="360 90 21" dur=".1s" repeatCount="indefinite"/></ellipse>
    <circle cx="90" cy="21" r="12.5" fill="#0a2342" opacity=".06"/></g>
  </g>
  <!-- fuselage -->
  <path d="M60 5 C68 5 70.5 17 70.5 30 L69.5 84 C69 94 65 104 60 104 C55 104 51 94 50.5 84 L49.5 30 C49.5 17 52 5 60 5Z" fill="url(#sp-body)" stroke="#9fb0bd" stroke-width=".7"/>
  <path d="M60 5 C65 5 67.5 10 68.4 16 L51.6 16 C52.5 10 55 5 60 5Z" fill="#14a8a2"/>
  <path d="M52.5 17.5 Q60 14.5 67.5 17.5 L68.6 27 Q60 24 51.4 27Z" fill="url(#sp-glass)"/>
  <path d="M54 19 Q58 17.6 60 17.6" stroke="#fff" stroke-width="1" opacity=".55" fill="none" stroke-linecap="round"/>
  <path d="M50 32 L50.5 84 M70 32 L69.5 84" stroke="#f2694b" stroke-width="1.6" opacity=".95"/>
  <path d="M59.2 32 V90" stroke="#e2b65c" stroke-width="1.2" opacity=".9"/>
  <path d="M63 34 V46 M56 34 V46" stroke="#b4c1cc" stroke-width=".5"/>
  <rect x="57.2" y="88" width="5.6" height="14" rx="2.5" fill="#f2694b"/>
</svg>`;

const BOAT_SVG = `<svg viewBox="0 0 100 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bt-hull" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#eef2f5"/><stop offset="1" stop-color="#a7b5c1"/></linearGradient>
    <linearGradient id="bt-wake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M50 92 L18 134 L82 134Z" fill="url(#bt-wake)"/>
  <path d="M50 92 L30 124 M50 92 L70 124" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>
  <path d="M50 8 C64 26 68 52 66 90 Q66 98 60 98 L40 98 Q34 98 34 90 C32 52 36 26 50 8Z" fill="url(#bt-hull)" stroke="#9fb0bd" stroke-width=".8"/>
  <path d="M50 14 C60 30 63 54 62 86 L38 86 C37 54 40 30 50 14Z" fill="#fffdf9" stroke="#d3dbe1" stroke-width=".6"/>
  <path d="M38 60 Q50 54 62 60 L61.5 74 Q50 78 38.5 74Z" fill="#0a2342"/>
  <path d="M41 62 Q47 59 52 59" stroke="#fff" stroke-width="1" opacity=".5" fill="none" stroke-linecap="round"/>
  <rect x="38" y="26" width="24" height="3" fill="#14a8a2" opacity=".85"/>
  <path d="M38 38 Q50 34 62 38 L62 44 Q50 40 38 44Z" fill="#f2694b"/>
  <rect x="40" y="86" width="20" height="8" rx="2" fill="#e8eef2" stroke="#b4c1cc" stroke-width=".5"/>
  <rect x="46" y="94" width="8" height="8" rx="2" fill="#2a3b4d"/>
</svg>`;

const MLE_AIRPORT = {
  name: "Velana International Airport (MLE)",
  lat: 4.1918,
  lng: 73.5291,
};

const DEFAULT_CENTER: [number, number] = [73.2, 4.0];
const DEFAULT_ZOOM = 6.8;
const DEFAULT_PITCH = 42;
const DEFAULT_BEARING = -4;

export function Archipelago3DMap({
  initialResortSlug,
  resorts = RESORTS_DATA,
  className = "",
}: {
  initialResortSlug?: string;
  resorts?: MapResort[];
  className?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const [selectedResort, setSelectedResort] = useState<MapResort | null>(() => {
    if (initialResortSlug) {
      return resorts.find((r) => r.slug === initialResortSlug) ?? null;
    }
    return null;
  });
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [basemapType, setBasemapType] = useState<"satellite" | "ocean">("satellite");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [flight, setFlight] = useState<{ name: string; mode: string } | null>(null);
  const is3DRef = useRef(true);
  const flightRef = useRef<{ raf: number; marker: unknown; stop: () => void } | null>(null);

  // Smoothly fly camera to a specific resort with comfortable framing (entire island & lagoon visible)
  const flyToResort = useCallback((resort: MapResort) => {
    setSelectedResort(resort);
    const map = mapInstanceRef.current;
    if (!map) return;
    flightRef.current?.stop();
    const is3D = is3DRef.current;
    const finalView = {
      center: [resort.lng, resort.lat] as [number, number],
      zoom: 11.0,
      pitch: is3D ? 45 : 0,
      bearing: is3D ? 14 : 0,
    };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      map.flyTo({ ...finalView, speed: 1.1, curve: 1.4, essential: true });
      return;
    }
    void import("maplibre-gl").then((maplibregl) => {
      maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";
      if (mapInstanceRef.current !== map) return;
      const isPlane = resort.transferType === "Seaplane";
      const from: [number, number] = [MLE_AIRPORT.lng, MLE_AIRPORT.lat];
      const to: [number, number] = [resort.lng, resort.lat];
      // Planes fly straight; boats follow a traced water channel around islands.
      const path: [number, number][] = isPlane ? [from, to] : (BOAT_ROUTES[resort.id] ?? [from, to]);
      const kx = Math.cos((from[1] * Math.PI) / 180);
      const P = (i: number): [number, number] => path[i] ?? path[0] ?? from;
      const segLen: number[] = [];
      const L = (i: number): number => segLen[i] ?? 0;
      let total = 0;
      for (let i = 1; i < path.length; i++) {
        const l = Math.hypot((P(i)[0] - P(i - 1)[0]) * kx, P(i)[1] - P(i - 1)[1]);
        segLen.push(l);
        total += l;
      }
      const bearingOf = (a: [number, number], b: [number, number]) =>
        ((Math.atan2((b[0] - a[0]) * kx, b[1] - a[1]) * 180) / Math.PI + 360) % 360;
      const at = (d: number): { pos: [number, number]; seg: number } => {
        let rem = d;
        for (let i = 0; i < segLen.length; i++) {
          if (rem <= L(i) || i === segLen.length - 1) {
            const f = Math.min(1, rem / L(i));
            return {
              pos: [P(i)[0] + (P(i + 1)[0] - P(i)[0]) * f, P(i)[1] + (P(i + 1)[1] - P(i)[1]) * f],
              seg: i,
            };
          }
          rem -= L(i);
        }
        return { pos: P(path.length - 1), seg: segLen.length - 1 };
      };
      let heading = bearingOf(P(0), P(1));

      const size = isPlane ? 92 : 46;
      const el = document.createElement("div");
      el.style.cssText = `position:relative;width:${size}px;height:${isPlane ? size : size * 1.3}px;pointer-events:none;`;
      const art = isPlane ? SEAPLANE_SVG : BOAT_SVG;
      el.innerHTML = `
        <div data-shadow style="position:absolute;inset:0;filter:brightness(0) blur(3px);opacity:.32">${art}</div>
        <div data-body style="position:absolute;inset:0;transform-origin:50% 50%;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))">${art}</div>
        <div data-spray style="position:absolute;left:50%;top:50%;width:${size * 0.8}px;height:${size * 0.8}px;margin:-${size * 0.4}px 0 0 -${size * 0.4}px;border-radius:50%;border:2px solid rgba(255,255,255,.65);opacity:0"></div>`;
      const shadowEl = el.querySelector<HTMLElement>("[data-shadow]")!;
      const bodyEl = el.querySelector<HTMLElement>("[data-body]")!;
      const sprayEl = el.querySelector<HTMLElement>("[data-spray]")!;
      const marker = new maplibregl.Marker({
        element: el,
        rotation: heading,
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat(P(0))
        .addTo(map);

      const trailId = "flight-trail";
      const emptyTrail = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [from, from] } };
      if (map.getSource(trailId)) {
        map.getSource(trailId).setData(emptyTrail);
      } else {
        map.addSource(trailId, { type: "geojson", data: emptyTrail });
        map.addLayer({
          id: "flight-trail-glow",
          type: "line",
          source: trailId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#E2B65C", "line-width": 6, "line-opacity": 0.22, "line-blur": 4 },
        });
        map.addLayer({
          id: "flight-trail-line",
          type: "line",
          source: trailId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#FFFDF9", "line-width": 1.6, "line-opacity": 0.85, "line-dasharray": isPlane ? [1, 0] : [3, 2] },
        });
      }

      setFlight({ name: resort.name, mode: isPlane ? "Seaplane" : resort.transferType });
      const duration = isPlane ? 8500 : 9000;
      const start = performance.now();
      map.jumpTo({ center: P(0), zoom: 9.4, pitch: is3D ? 55 : 0, bearing: heading });
      const state = { raf: 0, marker, stop: () => {} };
      let done = false;
      const stop = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(state.raf);
        marker.remove();
        if (mapInstanceRef.current === map && map.getSource(trailId)) map.getSource(trailId).setData(emptyTrail);
        if (flightRef.current === state) flightRef.current = null;
        setFlight(null);
      };
      state.stop = stop;
      flightRef.current = state;

      let camBearing = heading;
      const tick = (now: number) => {
        if (done) return;
        const t = Math.min(1, (now - start) / duration);
        // slow taxi / takeoff, steady cruise, gentle touchdown
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const { pos, seg } = at(e * total);
        // smoothly steer toward the current segment's heading (boats turn through bends)
        const target = bearingOf(P(seg), P(seg + 1));
        const diff = ((target - heading + 540) % 360) - 180;
        heading = (heading + diff * 0.08 + 360) % 360;
        marker.setLngLat(pos);
        marker.setRotation(heading);
        const done0 = [...path.slice(0, seg + 1), pos];
        const src = map.getSource(trailId);
        if (src) src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: done0 } });

        // altitude 0 on water -> 1 in cruise; drives size, shadow offset and bank
        const alt = isPlane
          ? Math.sin((Math.min(1, t / 0.2) * Math.PI) / 2) * Math.sin((Math.min(1, (1 - t) / 0.22) * Math.PI) / 2)
          : 0;
        const a = (-heading * Math.PI) / 180;
        const vx = 20 * alt, vy = 28 * alt;
        shadowEl.style.transform = `translate(${vx * Math.cos(a) - vy * Math.sin(a)}px,${vx * Math.sin(a) + vy * Math.cos(a)}px) scale(${1 - alt * 0.1})`;
        const bank = isPlane ? Math.max(-14, Math.min(14, diff * 0.6)) * alt : Math.max(-6, Math.min(6, diff * 0.4));
        bodyEl.style.transform = `scale(${1 + alt * 0.2}) rotate(${bank}deg)`;
        const edge = isPlane ? 0.1 : 0.06;
        const onWater = t < edge || t > 1 - edge;
        const k = t < edge ? 1 - t / edge : t > 1 - edge ? (t - (1 - edge)) / edge : 0;
        sprayEl.style.opacity = onWater && isPlane ? String(0.65 * k) : "0";
        sprayEl.style.transform = `scale(${1 + k * 0.8})`;

        // chase camera (eases its bearing so it never whips around)
        const cdiff = ((heading - camBearing + 540) % 360) - 180;
        camBearing = (camBearing + cdiff * 0.04 + 360) % 360;
        const zoom = 9.4 + t * (isPlane ? 1.4 : 2.0);
        map.jumpTo({ center: pos, zoom, bearing: camBearing, pitch: is3D ? 55 : 0 });
        if (t < 1) {
          state.raf = requestAnimationFrame(tick);
        } else {
          stop();
          map.flyTo({ ...finalView, speed: 0.9, curve: 1.2, essential: true });
        }
      };
      state.raf = requestAnimationFrame(tick);
    });
  }, []);

  const skipFlight = useCallback(() => {
    flightRef.current?.stop();
    const map = mapInstanceRef.current;
    if (map && selectedResort) {
      map.flyTo({ center: [selectedResort.lng, selectedResort.lat], zoom: 11, pitch: is3DRef.current ? 45 : 0, bearing: is3DRef.current ? 14 : 0, essential: true });
    }
  }, [selectedResort]);

  // Reset to whole archipelago overview
  const resetToOverview = useCallback(() => {
    flightRef.current?.stop();
    setSelectedResort(null);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: is3DMode ? DEFAULT_PITCH : 0,
      bearing: is3DMode ? DEFAULT_BEARING : 0,
      speed: 1.2,
      essential: true,
    });
  }, [is3DMode]);

  // Toggle 3D Tilt perspective
  const toggle3D = useCallback(() => {
    const next3D = !is3DMode;
    is3DRef.current = next3D;
    setIs3DMode(next3D);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.easeTo({
      pitch: next3D ? 52 : 0,
      bearing: next3D ? -8 : 0,
      duration: 1000,
    });
  }, [is3DMode]);

  // Zoom controls
  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut({ duration: 300 });
  };

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isSubscribed = true;

    async function initMap() {
      const maplibregl = await import("maplibre-gl");
      maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";

      if (!isSubscribed || !mapContainerRef.current) return;

      const satelliteStyle = {
        version: 8 as const,
        sources: {
          "esri-satellite": {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          "esri-labels": {
            type: "raster" as const,
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "esri-satellite-layer",
            type: "raster" as const,
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "esri-labels-layer",
            type: "raster" as const,
            source: "esri-labels",
            minzoom: 4,
            maxzoom: 19,
            paint: {
              "raster-opacity": 0.45,
            },
          },
        ],
      };

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: satelliteStyle,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        maxPitch: 75,
        minZoom: 4.5,
        maxZoom: 17,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        if (!isSubscribed) return;
        setMapLoaded(true);

        // Add Flight Paths GeoJSON line layer
        const flightPathsGeoJson = {
          type: "FeatureCollection" as const,
          features: resorts.map((resort) => ({
            type: "Feature" as const,
            properties: {
              id: resort.id,
              name: resort.name,
              color: resort.color,
            },
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [MLE_AIRPORT.lng, MLE_AIRPORT.lat],
                [resort.lng, resort.lat],
              ],
            },
          })),
        };

        map.addSource("flight-paths", {
          type: "geojson",
          data: flightPathsGeoJson,
        });

        // Delicate Seaplane Flight Corridor Lines
        map.addLayer({
          id: "flight-paths-glow",
          type: "line",
          source: "flight-paths",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#22d3ee",
            "line-width": 1.5,
            "line-opacity": 0.35,
            "line-dasharray": [2, 4],
          },
        });

        // Add MLE Airport Hub Marker
        const airportEl = document.createElement("div");
        airportEl.className = "mle-hub-marker";
        airportEl.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(10, 35, 66, 0.88);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(244, 63, 94, 0.6);
            padding: 3px 8px;
            border-radius: 9999px;
            color: white;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            transform: translate(-50%, -50%);
          ">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f43f5e;"></span>
            <span>MLE Airport Hub</span>
          </div>
        `;
        new maplibregl.Marker({ element: airportEl, anchor: "center" })
          .setLngLat([MLE_AIRPORT.lng, MLE_AIRPORT.lat])
          .addTo(map);

        // Add 3D Markers for each resort
        resorts.forEach((resort) => {
          const markerEl = document.createElement("div");
          markerEl.className = "resort-3d-marker";
          markerEl.style.cursor = "pointer";
          markerEl.innerHTML = `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              background: rgba(10, 35, 66, 0.85);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.25);
              padding: 4px 10px;
              border-radius: 9999px;
              color: white;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.01em;
              box-shadow: 0 6px 16px rgba(0,0,0,0.5);
              transition: all 0.2s ease;
              transform: translate(-50%, -50%);
              white-space: nowrap;
            ">
              <span style="
                display:inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${resort.color};
                box-shadow: 0 0 10px ${resort.color};
              "></span>
              <span class="rm-label">${resort.name}</span>
            </div>
          `;

          markerEl.addEventListener("mouseenter", () => {
            const inner = markerEl.querySelector("div");
            if (inner) {
              inner.style.border = `1px solid ${resort.color}`;
              inner.style.transform = "translate(-50%, -50%) scale(1.08)";
              inner.style.background = "rgba(14, 45, 82, 0.95)";
            }
          });

          markerEl.addEventListener("mouseleave", () => {
            const inner = markerEl.querySelector("div");
            if (inner) {
              inner.style.border = "1px solid rgba(255, 255, 255, 0.25)";
              inner.style.transform = "translate(-50%, -50%) scale(1)";
              inner.style.background = "rgba(10, 35, 66, 0.85)";
            }
          });

          markerEl.addEventListener("click", () => {
            flyToResort(resort);
          });

          new maplibregl.Marker({ element: markerEl, anchor: "center" })
            .setLngLat([resort.lng, resort.lat])
            .addTo(map);
        });

        // If an initial resort slug was passed, fly to it immediately
        if (initialResortSlug) {
          const matched = resorts.find((r) => r.slug === initialResortSlug);
          if (matched) {
            flyToResort(matched);
          }
        }
      });
    }

    initMap();

    return () => {
      isSubscribed = false;
      flightRef.current?.stop();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [flyToResort, initialResortSlug, resorts]);

  // Toggle between Photorealistic Satellite and Ocean Bathymetry
  const toggleBasemap = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const nextType = basemapType === "satellite" ? "ocean" : "satellite";
    setBasemapType(nextType);

    const tileUrl =
      nextType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}";

    const source = mapInstanceRef.current.getSource("esri-satellite");
    if (source && typeof source.setTiles === "function") {
      source.setTiles([tileUrl]);
    }
  }, [basemapType]);

  return (
    <div
      className={`relative h-[72vh] min-h-[460px] max-h-[720px] w-full overflow-hidden rounded-3xl border border-border-subtle bg-[#0a2342] shadow-2 select-none ${className}`}
    >
      {/* Real MapLibre GL Map Canvas */}
      <div ref={mapContainerRef} className="size-full" />

      {/* In-flight status */}
      {flight ? (
        <div className="absolute top-4 left-4 right-4 sm:right-auto z-30 flex items-center justify-between sm:justify-start gap-3 rounded-full border border-white/15 bg-[#0a2342]/80 py-1.5 pl-3.5 pr-1.5 text-white shadow-lg backdrop-blur-md animate-in fade-in">
          <Plane size={14} className="text-[#E2B65C]" aria-hidden="true" />
          <span className="text-xs font-medium" role="status">
            {flight.mode} to {flight.name}
          </span>
          <button
            type="button"
            onClick={skipFlight}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25"
          >
            Skip
          </button>
        </div>
      ) : null}

      {/* Top Right: Minimal Unified Control Capsule */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-[#0a2342]/80 p-1.5 backdrop-blur-md text-white shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={toggle3D}
          aria-pressed={is3DMode}
          aria-label={is3DMode ? "Switch to flat 2D view" : "Switch to 3D perspective tilt"}
          title={is3DMode ? "Switch to Flat 2D View" : "Switch to 3D Perspective Tilt"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            is3DMode ? "bg-[#7ccdc6] text-[#0a2342]" : "text-slate-300 hover:text-white"
          }`}
        >
          <Layers size={13} aria-hidden="true" />
          <span className="hidden sm:inline">{is3DMode ? "3D Tilt" : "2D"}</span>
        </button>

        <button
          type="button"
          onClick={toggleBasemap}
          aria-label={
            basemapType === "satellite"
              ? "Switch to bathymetric ocean chart"
              : "Switch to photorealistic satellite"
          }
          title={
            basemapType === "satellite"
              ? "Switch to Bathymetric Ocean Chart"
              : "Switch to Photorealistic Satellite"
          }
          className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            basemapType === "satellite" ? "text-[#9adbd5] hover:bg-white/10" : "bg-[#7ccdc6] text-[#0a2342]"
          }`}
        >
          <Compass size={13} aria-hidden="true" />
          <span className="hidden sm:inline">{basemapType === "satellite" ? "Satellite" : "Bathymetry"}</span>
        </button>

        <div className="hidden sm:block h-3 w-px bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom In"
          className="hidden sm:flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom Out"
          className="hidden sm:flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut size={14} aria-hidden="true" />
        </button>

        <div className="hidden sm:block h-3 w-px bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={resetToOverview}
          aria-label="Reset archipelago overview"
          title="Reset Whole Archipelago Overview"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={13} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom Horizontal Quick Sanctuary Fly-To Carousel */}
      <div className={`absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 z-20 items-center gap-3 pointer-events-none ${selectedResort ? "hidden sm:flex" : "flex"}`}>
        {/* Quick Sanctuary Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-[#0a2342]/80 p-2 backdrop-blur-md no-scrollbar max-w-2xl pointer-events-auto">
          <span className="hidden sm:inline text-xs text-slate-400 pl-2 shrink-0">
            Fly to
          </span>
          {resorts.map((r) => {
            const isSelected = selectedResort?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => flyToResort(r)}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#7ccdc6] text-[#0a2342] font-bold shadow-sm"
                    : "text-slate-200 hover:text-white hover:bg-white/15"
                }`}
              >
                {r.name.replace(/^The /, "").replace(/ (Maldives|Resort|by .*)$/, "").split(" ").slice(0, 2).join(" ")}
              </button>
            );
          })}
        </div>

      </div>

      {/* Floating Selected Resort Inspector Card (docked at bottom-left so island view remains unobstructed) */}
      {selectedResort ? (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-20 sm:left-4 sm:right-auto sm:max-w-sm z-30 rounded-2xl border border-white/20 bg-[#0a2342]/92 p-4 sm:p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: selectedResort.color }}
                />
                <span className="text-[11px] text-[#9adbd5]">
                  {selectedResort.atoll}
                </span>
              </div>
              <h3 className="mt-1 font-display text-xl font-medium text-white leading-tight">
                {selectedResort.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedResort(null)}
              aria-label="Close resort inspector"
              className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 hidden sm:block text-xs text-slate-300 leading-relaxed font-light">
            {selectedResort.summary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
              <Plane size={11} className="text-[#9adbd5]" aria-hidden="true" />
              {selectedResort.transferSummary ?? "Transfer details on request"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
              <MapPin size={11} className="text-emerald-400" />
              {selectedResort.lat.toFixed(4)}°N, {selectedResort.lng.toFixed(4)}°E
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/10">
            <Button
              asChild
              variant="conversion"
              className="flex-1 rounded-full py-2 text-xs font-semibold shadow-sm"
            >
              <Link href={`/resorts/${selectedResort.slug}`}>
                View resort
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-full py-2 text-xs font-semibold border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/plan">
                Plan trip
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Loading overlay while satellite tiles initialize */}
      {!mapLoaded ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a2342] text-white">
          <div className="size-8 rounded-full border-2 border-[#7ccdc6] border-t-transparent animate-spin" />
          <span className="mt-3 text-xs text-slate-300 font-mono">
            Charting the atolls...
          </span>
        </div>
      ) : null}
    </div>
  );
}
