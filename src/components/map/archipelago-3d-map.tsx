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
  ExternalLink,
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
    highlights: ["Legendary Living House Reef", "Piano Deck in the Lagoon", "Maldivian Hospitality Since 1973"],
    vibe: "Intimate Classic Romance",
    summary: "Celebrated worldwide for over fifty years for possessing one of the most vibrant, teeming house reefs reachable directly from shore.",
    tag: "World-Class House Reef",
    color: "#fb923c",
  },
];

const MLE_AIRPORT = {
  name: "Velana International Airport (MLE)",
  lat: 4.1918,
  lng: 73.5291,
};

const DEFAULT_CENTER: [number, number] = [73.35, 4.4];
const DEFAULT_ZOOM = 7.1;
const DEFAULT_PITCH = 50;
const DEFAULT_BEARING = -6;

export function Archipelago3DMap({
  initialResortSlug,
  className = "",
}: {
  initialResortSlug?: string;
  className?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const [selectedResort, setSelectedResort] = useState<MapResort | null>(() => {
    if (initialResortSlug) {
      return RESORTS_DATA.find((r) => r.slug === initialResortSlug) ?? null;
    }
    return null;
  });
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [basemapType, setBasemapType] = useState<"satellite" | "ocean">("satellite");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Smoothly fly camera to a specific resort
  const flyToResort = useCallback((resort: MapResort) => {
    setSelectedResort(resort);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [resort.lng, resort.lat],
      zoom: 12.6,
      pitch: is3DMode ? 58 : 0,
      bearing: is3DMode ? 18 : 0,
      speed: 1.1,
      curve: 1.4,
      essential: true,
    });
  }, [is3DMode]);

  // Reset to whole archipelago overview
  const resetToOverview = useCallback(() => {
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
          features: RESORTS_DATA.map((resort) => ({
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
            background: rgba(3, 20, 28, 0.88);
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
        RESORTS_DATA.forEach((resort) => {
          const markerEl = document.createElement("div");
          markerEl.className = "resort-3d-marker";
          markerEl.style.cursor = "pointer";
          markerEl.innerHTML = `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              background: rgba(3, 18, 25, 0.85);
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
              <span>${resort.name}</span>
            </div>
          `;

          markerEl.addEventListener("mouseenter", () => {
            const inner = markerEl.querySelector("div");
            if (inner) {
              inner.style.border = `1px solid ${resort.color}`;
              inner.style.transform = "translate(-50%, -50%) scale(1.08)";
              inner.style.background = "rgba(4, 28, 38, 0.95)";
            }
          });

          markerEl.addEventListener("mouseleave", () => {
            const inner = markerEl.querySelector("div");
            if (inner) {
              inner.style.border = "1px solid rgba(255, 255, 255, 0.25)";
              inner.style.transform = "translate(-50%, -50%) scale(1)";
              inner.style.background = "rgba(3, 18, 25, 0.85)";
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
          const matched = RESORTS_DATA.find((r) => r.slug === initialResortSlug);
          if (matched) {
            flyToResort(matched);
          }
        }
      });
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [flyToResort, initialResortSlug]);

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
      className={`relative h-[620px] sm:h-[720px] w-full overflow-hidden rounded-3xl border border-border-subtle bg-[#020b10] shadow-2 select-none ${className}`}
    >
      {/* Real MapLibre GL Map Canvas */}
      <div ref={mapContainerRef} className="size-full" />

      {/* Top Left: Clean Live Status Pill */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3.5 py-1.5 backdrop-blur-md shadow-lg text-white">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide">
            Real Satellite 3D Map
          </span>
          <span className="text-[11px] text-cyan-300 font-mono">
            · {basemapType === "satellite" ? "Photorealistic Aerial" : "Bathymetric Ocean"}
          </span>
        </div>
      </div>

      {/* Top Right: Minimal Unified Control Capsule */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/80 p-1.5 backdrop-blur-md text-white shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={toggle3D}
          title={is3DMode ? "Switch to Flat 2D View" : "Switch to 3D Perspective Tilt"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            is3DMode ? "bg-cyan-400 text-[#031520]" : "text-slate-300 hover:text-white"
          }`}
        >
          <Layers size={13} />
          <span>{is3DMode ? "3D Tilt" : "2D"}</span>
        </button>

        <button
          type="button"
          onClick={toggleBasemap}
          title={basemapType === "satellite" ? "Switch to Bathymetric Ocean Chart" : "Switch to Photorealistic Satellite"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            basemapType === "satellite" ? "text-cyan-300 hover:bg-white/10" : "bg-cyan-400 text-[#031520]"
          }`}
        >
          <Compass size={13} />
          <span>{basemapType === "satellite" ? "Satellite" : "Bathymetry"}</span>
        </button>

        <div className="h-3 w-px bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut size={14} />
        </button>

        <div className="h-3 w-px bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={resetToOverview}
          title="Reset Whole Archipelago Overview"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Bottom Horizontal Quick Sanctuary Fly-To Carousel */}
      <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Quick Sanctuary Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-slate-950/80 p-2 backdrop-blur-md no-scrollbar max-w-2xl pointer-events-auto">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 pl-2 shrink-0">
            Fly to:
          </span>
          {RESORTS_DATA.map((r) => {
            const isSelected = selectedResort?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => flyToResort(r)}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-cyan-400 text-[#031520] font-bold shadow-sm"
                    : "text-slate-200 hover:text-white hover:bg-white/15"
                }`}
              >
                {r.name.split(" ")[0]}
              </button>
            );
          })}
        </div>

        {/* Orbit hint */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
          <span>Right-click &amp; drag to rotate 3D angle</span>
        </div>
      </div>

      {/* Floating Selected Resort Inspector Card */}
      {selectedResort ? (
        <div className="absolute top-16 left-4 right-4 sm:right-auto sm:max-w-sm z-30 rounded-2xl border border-white/20 bg-slate-950/90 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: selectedResort.color }}
                />
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">
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
              aria-label="Close"
              className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-300 leading-relaxed font-light">
            {selectedResort.summary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
              <Plane size={11} className="text-cyan-300" />
              {selectedResort.transferDuration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
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
                Explore Sanctuary &rarr;
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-full py-2 text-xs font-semibold border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/plan">
                Plan Trip <ExternalLink size={11} className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Loading overlay while satellite tiles initialize */}
      {!mapLoaded ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#03141c] text-white">
          <div className="size-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="mt-3 text-xs text-slate-300 font-mono">
            Loading Real Satellite Imagery...
          </span>
        </div>
      ) : null}
    </div>
  );
}
