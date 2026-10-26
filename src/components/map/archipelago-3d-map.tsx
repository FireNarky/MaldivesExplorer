"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Gift,
  Layers,
  Maximize2,
  Minimize2,
  Moon,
  Plane,
  RotateCcw,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    priceNote: "Price on request",
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
    vibe: "Original Barefoot Luxury Reserve",
    summary: "The founding icon of sustainable Maldivian barefoot luxury, nestled in lush ancient jungle with private white-sand shores.",
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
    transferDuration: "40 min Bespoke VIP Seaplane",
    highlights: ["LVMH Haute Gastronomy", "Guerlain Private Island Spa", "Monumental 7m Cathedral Doors"],
    vibe: "French High Fashion Island Maison",
    summary: "Designed by Jean-Michel Gathy for LVMH, delivering bespoke French art de recevoir across ultra-spacious architectural villas.",
    tag: "LVMH Masterpiece",
    color: "#f59e0b",
    featured: true,
  },
  {
    id: "the-ritz-carlton-maldives",
    name: "The Ritz-Carlton Maldives, Fari Islands",
    slug: "the-ritz-carlton-maldives",
    atoll: "North Malé Atoll",
    lat: 4.5933,
    lng: 73.5822,
    transferType: "Speedboat",
    transferDuration: "45 min Luxury Yacht / 10 min Seaplane",
    highlights: ["Kerry Hill Circular Architecture", "Dedicated Aris Meeha Butler", "Fari Marina Village"],
    vibe: "Futuristic Minimalist Wonder",
    summary: "Visionary circular overwater structures that frame endless ocean horizons, celebrating the flow of Maldivian breezes.",
    tag: "Visionary Architecture",
    color: "#38bdf8",
    featured: true,
  },
  {
    id: "waldorf-astoria-ithaafushi",
    name: "Waldorf Astoria Maldives Ithaafushi",
    slug: "waldorf-astoria-ithaafushi",
    atoll: "South Malé Atoll",
    lat: 3.9514,
    lng: 73.4021,
    transferType: "Yacht",
    transferDuration: "40 min Private Luxury Yacht",
    highlights: ["11 World-Class Dining Venues", "Terra Bamboo Treehouse Pods", "Stella Maris Ocean Villas"],
    vibe: "Three Interconnected Paradise Islands",
    summary: "An expansive playground of culinary excellence and overwater sanctuaries accessible via private yacht directly from the runway.",
    tag: "Private Yacht Access",
    color: "#f43f5e",
    featured: true,
  },
  {
    id: "hurawalhi-island-resort",
    name: "Hurawalhi Island Resort",
    slug: "hurawalhi-island-resort",
    atoll: "Lhaviyani Atoll",
    lat: 5.5244,
    lng: 73.4429,
    transferType: "Seaplane",
    transferDuration: "40 min Scenic Seaplane",
    highlights: ["5.8 Undersea Restaurant", "Adults-Only Serenity", "Thriving House Reef Channel"],
    vibe: "Romantic Ocean Sanctuary",
    summary: "Home to the world's largest all-glass underwater restaurant, situated 5.8 meters beneath the surface surrounded by coral life.",
    tag: "5.8 Undersea Dining",
    color: "#8b5cf6",
    featured: true,
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

// Major Maldivian Atolls Coordinates & Geometry
const ATOLL_CENTERS = [
  { name: "Haa Alif Atoll", lat: 6.95, lng: 73.0, radius: 24 },
  { name: "Haa Dhaalu Atoll", lat: 6.6, lng: 72.95, radius: 20 },
  { name: "Shaviyani Atoll", lat: 6.25, lng: 73.1, radius: 22 },
  { name: "Noonu Atoll", lat: 5.85, lng: 73.25, radius: 25, active: true },
  { name: "Raa Atoll", lat: 5.65, lng: 72.95, radius: 22 },
  { name: "Lhaviyani Atoll", lat: 5.42, lng: 73.48, radius: 18, active: true },
  { name: "Baa Atoll (UNESCO)", lat: 5.13, lng: 72.97, radius: 26, active: true },
  { name: "Kaafu (North Malé)", lat: 4.45, lng: 73.52, radius: 28, active: true },
  { name: "Velana Airport (MLE)", lat: 4.1918, lng: 73.5291, radius: 10, isHub: true },
  { name: "South Malé Atoll", lat: 3.92, lng: 73.45, radius: 24, active: true },
  { name: "Alif Alif (North Ari)", lat: 4.15, lng: 72.85, radius: 20 },
  { name: "Alif Dhaalu (South Ari)", lat: 3.65, lng: 72.82, radius: 24 },
  { name: "Vaavu Atoll", lat: 3.5, lng: 73.55, radius: 18 },
  { name: "Meemu Atoll", lat: 2.95, lng: 73.5, radius: 19 },
  { name: "Faafu Atoll", lat: 3.1, lng: 72.95, radius: 16 },
  { name: "Dhaalu Atoll", lat: 2.68, lng: 72.98, radius: 22 },
  { name: "Thaa Atoll", lat: 2.3, lng: 73.15, radius: 24 },
  { name: "Laamu Atoll", lat: 1.95, lng: 73.45, radius: 22 },
  { name: "Gaafu Alifu (Huvadhoo N)", lat: 0.65, lng: 73.35, radius: 28 },
  { name: "Gaafu Dhaalu (Huvadhoo S)", lat: 0.35, lng: 73.2, radius: 26 },
  { name: "Fuvahmulah", lat: -0.29, lng: 73.42, radius: 10 },
  { name: "Addu Atoll (Equator South)", lat: -0.63, lng: 73.15, radius: 18 },
];

const MLE_AIRPORT = {
  name: "Velana International Airport (MLE)",
  lat: 4.1918,
  lng: 73.5291,
};

export function Archipelago3DMap({
  initialResortSlug,
  className = "",
}: {
  initialResortSlug?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map Controls State
  const [selectedResort, setSelectedResort] = useState<MapResort | null>(() => {
    if (initialResortSlug) {
      return RESORTS_DATA.find((r) => r.slug === initialResortSlug) ?? RESORTS_DATA[0] ?? null;
    }
    return RESORTS_DATA[0] ?? null;
  });
  const [hoveredResort, setHoveredResort] = useState<MapResort | null>(null);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [showFlightPaths, setShowFlightPaths] = useState<boolean>(true);
  const [filterAtoll, setFilterAtoll] = useState<string>("ALL");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 3D Camera / Transformation State
  const [pitch, setPitch] = useState<number>(48); // 3D Tilt Angle (deg)
  const [yaw, setYaw] = useState<number>(-8); // 3D Rotation (deg)
  const [zoom, setZoom] = useState<number>(1.1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number; pitch: number; yaw: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
    pitch: 48,
    yaw: -8,
  });

  // Animation time tracker
  const timeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Filtered resorts based on selection
  const visibleResorts = useMemo(() => {
    if (filterAtoll === "ALL") return RESORTS_DATA;
    if (filterAtoll === "BAA") return RESORTS_DATA.filter((r) => r.atoll.includes("Baa"));
    if (filterAtoll === "NOONU_LHAVIYANI")
      return RESORTS_DATA.filter((r) => r.atoll.includes("Noonu") || r.atoll.includes("Lhaviyani"));
    if (filterAtoll === "MALE") return RESORTS_DATA.filter((r) => r.atoll.includes("Malé"));
    if (filterAtoll === "SLIDES") return RESORTS_DATA.filter((r) => r.highlights.some((h) => h.includes("Slide")));
    if (filterAtoll === "UNDERSEA") return RESORTS_DATA.filter((r) => r.highlights.some((h) => h.includes("Undersea")));
    return RESORTS_DATA;
  }, [filterAtoll]);

  // Coordinate Projection: Lat/Lng -> Canvas 2D Space
  // Maldives bounds: Lat ~7.2 to -0.8 (span: 8.0), Lng ~72.5 to 73.8 (span: 1.3)
  const projectCoords = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const minLat = -0.9;
      const maxLat = 7.3;
      const minLng = 72.4;
      const maxLng = 73.9;

      // Center around Malé Airport (lat ~4.2, lng ~73.3)
      const normalizedY = (maxLat - lat) / (maxLat - minLat); // 0 at North, 1 at South
      const normalizedX = (lng - minLng) / (maxLng - minLng);

      const mapWidth = Math.min(width, height * 0.75);
      const startX = width / 2 - mapWidth / 2;
      const startY = height * 0.08;
      const mapHeight = height * 0.84;

      return {
        x: startX + normalizedX * mapWidth,
        y: startY + normalizedY * mapHeight,
      };
    },
    []
  );

  // 3D Perspective Projection Matrix
  const apply3DTransform = useCallback(
    (x: number, y: number, z: number, width: number, height: number) => {
      if (!is3DMode) {
        // Flat 2D Mode with simple pan & zoom
        const cx = width / 2;
        const cy = height / 2;
        return {
          x: cx + (x - cx + panX) * zoom,
          y: cy + (y - cy + panY) * zoom,
          scale: zoom,
          depth: 1,
        };
      }

      // 3D Perspective Transform
      const cx = width / 2;
      const cy = height / 2;

      // 1. Center relative to camera & pan
      const rx = (x - cx + panX) * zoom;
      const ry = (y - cy + panY) * zoom;

      // 2. Rotate by Yaw (rotation around Y axis)
      const radYaw = (yaw * Math.PI) / 180;
      const cosYaw = Math.cos(radYaw);
      const sinYaw = Math.sin(radYaw);
      const x1 = rx * cosYaw - ry * sinYaw * 0.2;
      const y1 = rx * sinYaw * 0.2 + ry;

      // 3. Pitch / Tilt (tilt around X axis)
      const radPitch = (pitch * Math.PI) / 180;
      const cosPitch = Math.cos(radPitch);
      const sinPitch = Math.sin(radPitch);

      // Perspective foreshortening
      const distance = 900;
      const yProjected = y1 * cosPitch;
      const zTotal = distance + y1 * sinPitch - z * 1.5;
      const perspectiveScale = distance / Math.max(zTotal, 100);

      const finalX = cx + x1 * perspectiveScale;
      const finalY = cy + (yProjected - z) * perspectiveScale;

      return {
        x: finalX,
        y: finalY,
        scale: perspectiveScale * zoom,
        depth: zTotal,
      };
    },
    [is3DMode, pitch, yaw, zoom, panX, panY]
  );

  // Reset Camera View
  const handleResetCamera = () => {
    setPitch(48);
    setYaw(-8);
    setZoom(1.1);
    setPanX(0);
    setPanY(0);
  };

  // Center on a specific resort
  const focusOnResort = (resort: MapResort) => {
    setSelectedResort(resort);
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    const pt = projectCoords(resort.lat, resort.lng, width, height);
    // Smoothly pan camera towards resort
    const cx = width / 2;
    const cy = height / 2;
    setPanX((cx - pt.x) * 0.6);
    setPanY((cy - pt.y) * 0.6);
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      timeRef.current += 0.015;
      const t = timeRef.current;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Ocean Background Gradient & Bathymetry
      const oceanGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        Math.max(width, height)
      );

      if (isNightMode) {
        oceanGrad.addColorStop(0, "#06202c");
        oceanGrad.addColorStop(0.5, "#04141d");
        oceanGrad.addColorStop(1, "#02090e");
      } else {
        oceanGrad.addColorStop(0, "#083b4c");
        oceanGrad.addColorStop(0.4, "#062b38");
        oceanGrad.addColorStop(1, "#031821");
      }

      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Bathymetric Depth Rings
      ctx.save();
      ctx.strokeStyle = isNightMode ? "rgba(43, 188, 208, 0.06)" : "rgba(43, 188, 208, 0.08)";
      ctx.lineWidth = 1;
      for (let r = 100; r < Math.max(width, height); r += 80) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Render Equator Line (0°00'00" Lat)
      const eqPt1 = projectCoords(0, 72.0, width, height);
      const eqPt2 = projectCoords(0, 74.5, width, height);
      const eq3D1 = apply3DTransform(eqPt1.x, eqPt1.y, 0, width, height);
      const eq3D2 = apply3DTransform(eqPt2.x, eqPt2.y, 0, width, height);

      ctx.save();
      ctx.strokeStyle = isNightMode ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.5)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eq3D1.x, eq3D1.y);
      ctx.lineTo(eq3D2.x, eq3D2.y);
      ctx.stroke();

      // Equator Label
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = isNightMode ? "#fbbf24" : "#f59e0b";
      ctx.fillText("EQUATOR · 0°00'00\" N/S", eq3D1.x + 20, eq3D1.y - 6);
      ctx.restore();

      // 3. Render 26 Natural Atolls & Shallow Reefs
      ATOLL_CENTERS.forEach((atoll) => {
        const atollPt = projectCoords(atoll.lat, atoll.lng, width, height);
        const atoll3D = apply3DTransform(atollPt.x, atollPt.y, 0, width, height);

        const radiusScaled = atoll.radius * atoll3D.scale * (atoll.active ? 1.1 : 0.8);

        // Atoll Lagoon Glow
        const lagoonGlow = ctx.createRadialGradient(
          atoll3D.x,
          atoll3D.y,
          0,
          atoll3D.x,
          atoll3D.y,
          Math.max(radiusScaled, 10)
        );

        if (atoll.isHub) {
          lagoonGlow.addColorStop(0, "rgba(244, 63, 94, 0.3)");
          lagoonGlow.addColorStop(0.8, "rgba(244, 63, 94, 0.05)");
          lagoonGlow.addColorStop(1, "transparent");
        } else if (atoll.active) {
          lagoonGlow.addColorStop(0, isNightMode ? "rgba(43, 188, 208, 0.28)" : "rgba(43, 188, 208, 0.35)");
          lagoonGlow.addColorStop(0.7, isNightMode ? "rgba(34, 211, 238, 0.12)" : "rgba(34, 211, 238, 0.15)");
          lagoonGlow.addColorStop(1, "transparent");
        } else {
          lagoonGlow.addColorStop(0, "rgba(255, 255, 255, 0.08)");
          lagoonGlow.addColorStop(1, "transparent");
        }

        ctx.fillStyle = lagoonGlow;
        ctx.beginPath();
        ctx.arc(atoll3D.x, atoll3D.y, Math.max(radiusScaled, 6), 0, Math.PI * 2);
        ctx.fill();

        // Atoll Coral Rim Line
        ctx.strokeStyle = atoll.active
          ? isNightMode
            ? "rgba(43, 188, 208, 0.5)"
            : "rgba(43, 188, 208, 0.6)"
          : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = atoll.active ? 1.5 : 1;
        ctx.setLineDash(atoll.isHub ? [2, 2] : []);
        ctx.beginPath();
        ctx.arc(atoll3D.x, atoll3D.y, Math.max(radiusScaled * 0.7, 4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Atoll Title (Rendered on hover or zoomed in)
        if (atoll3D.scale > 0.85 || atoll.active) {
          ctx.font = atoll.active ? "bold 10px sans-serif" : "9px sans-serif";
          ctx.fillStyle = atoll.active ? (isNightMode ? "#67e8f9" : "#a5f3fc") : "rgba(255, 255, 255, 0.35)";
          ctx.fillText(atoll.name, atoll3D.x + radiusScaled * 0.8, atoll3D.y + 3);
        }
      });

      // 4. Parabolic 3D Seaplane Flight Paths from MLE Airport Hub
      const mlePt = projectCoords(MLE_AIRPORT.lat, MLE_AIRPORT.lng, width, height);
      const mle3D = apply3DTransform(mlePt.x, mlePt.y, 0, width, height);

      // Airport Hub Pulse Marker
      const airportPulse = (Math.sin(t * 3) + 1) * 0.5;
      ctx.fillStyle = "rgba(244, 63, 94, 0.8)";
      ctx.beginPath();
      ctx.arc(mle3D.x, mle3D.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.8 - airportPulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mle3D.x, mle3D.y, 6 + airportPulse * 12, 0, Math.PI * 2);
      ctx.stroke();

      if (showFlightPaths) {
        visibleResorts.forEach((resort) => {
          const isSelected = selectedResort?.id === resort.id;
          const isHovered = hoveredResort?.id === resort.id;

          // Quadratic Curve in 3D Space with altitude (Z elevation)
          const steps = 30;
          ctx.beginPath();
          let prevPoint: { x: number; y: number } | null = null;

          for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            // Interpolate Lat/Lng
            const curLat = MLE_AIRPORT.lat + (resort.lat - MLE_AIRPORT.lat) * progress;
            const curLng = MLE_AIRPORT.lng + (resort.lng - MLE_AIRPORT.lng) * progress;
            // Altitude peak in the middle of flight (Z axis)
            const altitudeZ = Math.sin(progress * Math.PI) * (isSelected ? 90 : 50);

            const pt2D = projectCoords(curLat, curLng, width, height);
            const pt3D = apply3DTransform(pt2D.x, pt2D.y, altitudeZ, width, height);

            if (i === 0) {
              ctx.moveTo(pt3D.x, pt3D.y);
            } else {
              ctx.lineTo(pt3D.x, pt3D.y);
            }

            // Animate flying seaplane beacon on active/hovered route
            if ((isSelected || isHovered) && Math.abs(progress - ((t * 0.3) % 1)) < 0.035) {
              prevPoint = pt3D;
            }
          }

          ctx.strokeStyle = isSelected
            ? "#22d3ee"
            : isHovered
            ? "#facc15"
            : isNightMode
            ? "rgba(43, 188, 208, 0.25)"
            : "rgba(43, 188, 208, 0.35)";
          ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
          ctx.setLineDash(isSelected ? [4, 4] : [2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated flying plane icon
          if (prevPoint && (isSelected || isHovered)) {
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#22d3ee";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(prevPoint.x, prevPoint.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // 5. Render 3D Resort Floating Beacons
      visibleResorts.forEach((resort) => {
        const isSelected = selectedResort?.id === resort.id;
        const isHovered = hoveredResort?.id === resort.id;
        const targetPt = projectCoords(resort.lat, resort.lng, width, height);

        // Bobbing elevation in 3D
        const bobZ = 20 + Math.sin(t * 2 + resort.lat * 5) * 6;
        const groundPt = apply3DTransform(targetPt.x, targetPt.y, 0, width, height);
        const floatPt = apply3DTransform(targetPt.x, targetPt.y, bobZ, width, height);

        // Shadow on the water plane below beacon
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(groundPt.x, groundPt.y, 6 * groundPt.scale, 3 * groundPt.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stalk connecting ground to hovering 3D diamond
        ctx.strokeStyle = isSelected ? "#22d3ee" : "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(groundPt.x, groundPt.y);
        ctx.lineTo(floatPt.x, floatPt.y);
        ctx.stroke();

        // Floating Diamond Beacon
        const size = (isSelected ? 9 : isHovered ? 8 : 6.5) * floatPt.scale;
        ctx.save();
        ctx.translate(floatPt.x, floatPt.y);

        // Outer glow
        ctx.shadowColor = resort.color;
        ctx.shadowBlur = isSelected ? 18 : 8;

        ctx.fillStyle = resort.color;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();

        // White inner core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Label above beacon
        const showLabel = isSelected || isHovered || floatPt.scale > 0.9;
        if (showLabel) {
          ctx.save();
          const labelY = floatPt.y - size - 8;
          ctx.font = isSelected ? "bold 12px sans-serif" : "600 11px sans-serif";

          // Text pill background
          const textWidth = ctx.measureText(resort.name).width;
          const padX = 8;
          const padY = 4;
          const bgX = floatPt.x - textWidth / 2 - padX;
          const bgY = labelY - 12 - padY;

          ctx.fillStyle = isSelected
            ? "rgba(6, 182, 212, 0.95)"
            : "rgba(8, 59, 76, 0.88)";
          ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, textWidth + padX * 2, 20, 10);
          ctx.fill();
          ctx.stroke();

          // Text
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(resort.name, floatPt.x, labelY);
          ctx.restore();
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    is3DMode,
    isNightMode,
    showFlightPaths,
    visibleResorts,
    selectedResort,
    hoveredResort,
    apply3DTransform,
    projectCoords,
  ]);

  // Mouse & Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX,
      panY,
      pitch,
      yaw,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hit test for hovering over resort beacons
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    let found: MapResort | null = null;
    for (const resort of visibleResorts) {
      const pt = projectCoords(resort.lat, resort.lng, width, height);
      const pt3D = apply3DTransform(pt.x, pt.y, 20, width, height);
      const dist = Math.hypot(mouseX - pt3D.x, mouseY - pt3D.y);
      if (dist < 24) {
        found = resort;
        break;
      }
    }
    setHoveredResort(found);

    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (e.shiftKey || !is3DMode) {
      // Pan
      setPanX(dragStartRef.current.panX + dx);
      setPanY(dragStartRef.current.panY + dy);
    } else {
      // 3D Orbit: Tilt (pitch) and Rotate (yaw)
      setYaw(Math.max(-45, Math.min(45, dragStartRef.current.yaw + dx * 0.15)));
      setPitch(Math.max(10, Math.min(75, dragStartRef.current.pitch + dy * 0.15)));
    }
  };

  const handleMouseUp = () => {
    if (hoveredResort) {
      setSelectedResort(hoveredResort);
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.max(0.6, Math.min(3.2, z + delta)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-border-subtle bg-[#031520] shadow-3 select-none ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "h-[650px] sm:h-[750px] w-full"
      } ${className}`}
    >
      {/* Top Floating Glass HUD Bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 pointer-events-none">
        {/* Title Badge & Atoll Counter */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/75 px-4 py-2 text-white shadow-lg backdrop-blur-md">
          <div className="flex size-7 items-center justify-center rounded-full bg-cyan-400 text-[#031520] font-bold text-xs shadow-sm">
            3D
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-display font-medium text-white flex items-center gap-1.5 leading-none">
              <span>Maldivian Archipelago 3D Explorer</span>
            </h1>
            <span className="text-[10px] text-cyan-300 font-mono">
              26 Natural Atolls · Equator Corridor
            </span>
          </div>
        </div>

        {/* View Mode & Lighting Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 p-1.5 text-white shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIs3DMode((v) => !v)}
            title={is3DMode ? "Switch to Flat 2D Nautical Chart" : "Switch to 3D Perspective Flyover"}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              is3DMode
                ? "bg-cyan-400 text-[#031520] shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Layers size={14} />
            <span>{is3DMode ? "3D Tilt" : "2D Chart"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNightMode((v) => !v)}
            title={isNightMode ? "Switch to Tropical Sun Lighting" : "Switch to Bioluminescent Night View"}
            className="flex size-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isNightMode ? <Sun size={15} className="text-amber-300" /> : <Moon size={15} className="text-cyan-300" />}
          </button>

          <button
            type="button"
            onClick={() => setShowFlightPaths((v) => !v)}
            title="Toggle Seaplane Flight Paths from MLE Airport Hub"
            className={`flex size-8 items-center justify-center rounded-full transition-colors ${
              showFlightPaths ? "text-cyan-300 bg-white/10" : "text-slate-400 hover:text-white"
            }`}
          >
            <Plane size={15} />
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Camera & Tilt"
            className="flex size-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Explorer"}
            className="flex size-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Filter Chips Bar (Horizontal Scrollable) */}
      <div className="absolute inset-x-0 top-18 sm:top-20 z-20 flex items-center gap-2 overflow-x-auto px-4 sm:px-6 pb-2 pointer-events-auto no-scrollbar">
        {[
          { id: "ALL", label: "All Sanctuaries (8)" },
          { id: "BAA", label: "Baa Atoll (UNESCO Mantas)" },
          { id: "NOONU_LHAVIYANI", label: "Noonu & Lhaviyani" },
          { id: "MALE", label: "North & South Malé" },
          { id: "SLIDES", label: "Overwater Slides" },
          { id: "UNDERSEA", label: "5.8 Undersea Dining" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterAtoll(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all backdrop-blur-md shadow-sm ${
              filterAtoll === f.id
                ? "border-cyan-400 bg-cyan-400 text-[#031520] font-bold"
                : "border-white/15 bg-slate-950/60 text-slate-200 hover:bg-white/10 hover:border-white/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="size-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* On-Screen Zoom / Pitch Buttons (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-20 hidden sm:flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-slate-950/75 p-1.5 text-white shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3.2, z + 0.2))}
          title="Zoom In"
          className="flex size-9 items-center justify-center rounded-xl hover:bg-white/15 transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
          title="Zoom Out"
          className="flex size-9 items-center justify-center rounded-xl hover:bg-white/15 transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <div className="my-0.5 h-px bg-white/15" />
        <button
          type="button"
          onClick={() => setPitch((p) => Math.min(70, p + 8))}
          title="Tilt 3D Angle Down"
          className="flex size-9 items-center justify-center rounded-xl hover:bg-white/15 transition-colors text-[11px] font-mono font-bold"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => setPitch((p) => Math.max(10, p - 8))}
          title="Tilt 3D Angle Up"
          className="flex size-9 items-center justify-center rounded-xl hover:bg-white/15 transition-colors text-[11px] font-mono font-bold"
        >
          ▼
        </button>
      </div>

      {/* Floating 3D Resort Inspector Card (Bottom Left) */}
      {selectedResort ? (
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:left-6 z-20 sm:max-w-md w-auto rounded-3xl border border-white/20 bg-slate-950/90 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: selectedResort.color }}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  {selectedResort.atoll}
                </span>
              </div>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-medium text-white leading-tight">
                {selectedResort.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedResort(null)}
              aria-label="Close inspector"
              className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 font-light leading-relaxed line-clamp-2">
            {selectedResort.summary}
          </p>

          {/* Highlights & Logistics Badges */}
          <div className="my-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/70 border border-cyan-400/30 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
              <Plane size={11} />
              {selectedResort.transferDuration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-200">
              <Gift size={11} className="text-amber-300" />
              {selectedResort.tag}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              Price on request
            </span>
          </div>

          {/* Action CTAs */}
          <div className="mt-4 flex items-center gap-2.5 pt-2 border-t border-white/10">
            <Button
              asChild
              variant="conversion"
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold shadow-md active:scale-95"
            >
              <Link href={`/resorts/${selectedResort.slug}`}>
                Explore Resort &rarr;
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-xl py-2.5 text-xs font-semibold border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href={`/plan`}>Plan Trip</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:left-6 z-20 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-slate-950/80 p-2 backdrop-blur-md no-scrollbar max-w-xl">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 pl-2 shrink-0">
            Fly to:
          </span>
          {RESORTS_DATA.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => focusOnResort(r)}
              className="shrink-0 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/15 transition-colors border border-transparent hover:border-white/10"
            >
              {r.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Drag & Rotation Guide Pill (Bottom Center) */}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center z-10">
        <span className="rounded-full bg-slate-950/60 px-3 py-1 text-[10px] font-mono tracking-wider text-slate-400 backdrop-blur-sm border border-white/10">
          DRAG TO ORBIT 3D · SCROLL TO ZOOM · TAP BEACONS TO INSPECT
        </span>
      </div>
    </div>
  );
}
