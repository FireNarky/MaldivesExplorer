"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Moon,
  Plane,
  RotateCcw,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
  Gift,
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

// Major Maldivian Atolls Coordinates & Geometry
const ATOLL_CENTERS = [
  { name: "Haa Alif", lat: 6.95, lng: 73.0, radius: 22 },
  { name: "Haa Dhaalu", lat: 6.6, lng: 72.95, radius: 18 },
  { name: "Shaviyani", lat: 6.25, lng: 73.1, radius: 20 },
  { name: "Noonu", lat: 5.85, lng: 73.25, radius: 24, active: true },
  { name: "Raa", lat: 5.65, lng: 72.95, radius: 20 },
  { name: "Lhaviyani", lat: 5.42, lng: 73.48, radius: 17, active: true },
  { name: "Baa (UNESCO)", lat: 5.13, lng: 72.97, radius: 25, active: true },
  { name: "North Malé", lat: 4.45, lng: 73.52, radius: 26, active: true },
  { name: "Velana Hub", lat: 4.1918, lng: 73.5291, radius: 9, isHub: true },
  { name: "South Malé", lat: 3.92, lng: 73.45, radius: 22, active: true },
  { name: "North Ari", lat: 4.15, lng: 72.85, radius: 19 },
  { name: "South Ari", lat: 3.65, lng: 72.82, radius: 23 },
  { name: "Vaavu", lat: 3.5, lng: 73.55, radius: 17 },
  { name: "Meemu", lat: 2.95, lng: 73.5, radius: 18 },
  { name: "Faafu", lat: 3.1, lng: 72.95, radius: 15 },
  { name: "Dhaalu", lat: 2.68, lng: 72.98, radius: 20 },
  { name: "Thaa", lat: 2.3, lng: 73.15, radius: 22 },
  { name: "Laamu", lat: 1.95, lng: 73.45, radius: 21 },
  { name: "Gaafu Alifu", lat: 0.65, lng: 73.35, radius: 26 },
  { name: "Gaafu Dhaalu", lat: 0.35, lng: 73.2, radius: 24 },
  { name: "Fuvahmulah", lat: -0.29, lng: 73.42, radius: 9 },
  { name: "Addu", lat: -0.63, lng: 73.15, radius: 17 },
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
    return null;
  });
  const [hoveredResort, setHoveredResort] = useState<MapResort | null>(null);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);

  // 3D Camera State
  const [pitch, setPitch] = useState<number>(44);
  const [yaw, setYaw] = useState<number>(-6);
  const [zoom, setZoom] = useState<number>(1.15);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number; pitch: number; yaw: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
    pitch: 44,
    yaw: -6,
  });

  const timeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Geodetic projection
  const bounds = useMemo(
    () => ({
      minLat: -1.2,
      maxLat: 7.4,
      minLng: 71.8,
      maxLng: 74.5,
    }),
    []
  );

  const projectCoords = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;

      const normY = (bounds.maxLat - lat) / latRange;
      const normX = (lng - bounds.minLng) / lngRange;

      const padding = 60;
      const x = padding + normX * (width - padding * 2);
      const y = padding + normY * (height - padding * 2);

      return { x, y };
    },
    [bounds]
  );

  // 3D Perspective Transform
  const apply3DTransform = useCallback(
    (x: number, y: number, z: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;

      if (!is3DMode) {
        return {
          x: cx + (x - cx + panX) * zoom,
          y: cy + (y - cy + panY) * zoom,
          scale: zoom,
          depth: 1,
        };
      }

      const rx = (x - cx + panX) * zoom;
      const ry = (y - cy + panY) * zoom;

      const radYaw = (yaw * Math.PI) / 180;
      const cosYaw = Math.cos(radYaw);
      const sinYaw = Math.sin(radYaw);
      const x1 = rx * cosYaw - ry * sinYaw * 0.15;
      const y1 = rx * sinYaw * 0.15 + ry;

      const radPitch = (pitch * Math.PI) / 180;
      const cosPitch = Math.cos(radPitch);
      const sinPitch = Math.sin(radPitch);

      const distance = 950;
      const yProjected = y1 * cosPitch;
      const zTotal = distance + y1 * sinPitch - z * 1.4;
      const perspectiveScale = distance / Math.max(zTotal, 100);

      return {
        x: cx + x1 * perspectiveScale,
        y: cy + (yProjected - z) * perspectiveScale,
        scale: perspectiveScale * zoom,
        depth: zTotal,
      };
    },
    [is3DMode, pitch, yaw, zoom, panX, panY]
  );

  const handleResetCamera = () => {
    setPitch(44);
    setYaw(-6);
    setZoom(1.15);
    setPanX(0);
    setPanY(0);
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      timeRef.current += 0.016;
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

      // 1. Serene Ocean Gradient
      const oceanGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        40,
        width / 2,
        height / 2,
        Math.max(width, height)
      );

      if (isNightMode) {
        oceanGrad.addColorStop(0, "#081d28");
        oceanGrad.addColorStop(0.5, "#04121a");
        oceanGrad.addColorStop(1, "#02090e");
      } else {
        oceanGrad.addColorStop(0, "#0a2e3d");
        oceanGrad.addColorStop(0.5, "#06222e");
        oceanGrad.addColorStop(1, "#03141c");
      }

      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Equator Line (0°00'00")
      const eqPt1 = projectCoords(0, 72.0, width, height);
      const eqPt2 = projectCoords(0, 74.4, width, height);
      const eq3D1 = apply3DTransform(eqPt1.x, eqPt1.y, 0, width, height);
      const eq3D2 = apply3DTransform(eqPt2.x, eqPt2.y, 0, width, height);

      ctx.save();
      ctx.strokeStyle = isNightMode ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.35)";
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(eq3D1.x, eq3D1.y);
      ctx.lineTo(eq3D2.x, eq3D2.y);
      ctx.stroke();

      ctx.font = "9px monospace";
      ctx.fillStyle = isNightMode ? "rgba(251, 191, 36, 0.6)" : "rgba(245, 158, 11, 0.7)";
      ctx.fillText("EQUATOR · 0°00'00\"", eq3D1.x + 12, eq3D1.y - 4);
      ctx.restore();

      // 3. Delicate Natural Atolls (Soft lagoon glow, NO noisy text labels)
      ATOLL_CENTERS.forEach((atoll) => {
        const atollPt = projectCoords(atoll.lat, atoll.lng, width, height);
        const atoll3D = apply3DTransform(atollPt.x, atollPt.y, 0, width, height);
        const radiusScaled = atoll.radius * atoll3D.scale * 0.9;

        // Lagoon soft glow
        const lagoonGlow = ctx.createRadialGradient(
          atoll3D.x,
          atoll3D.y,
          0,
          atoll3D.x,
          atoll3D.y,
          Math.max(radiusScaled, 8)
        );

        if (atoll.active) {
          lagoonGlow.addColorStop(0, isNightMode ? "rgba(34, 211, 238, 0.22)" : "rgba(43, 188, 208, 0.25)");
          lagoonGlow.addColorStop(0.7, isNightMode ? "rgba(34, 211, 238, 0.06)" : "rgba(43, 188, 208, 0.08)");
          lagoonGlow.addColorStop(1, "transparent");
        } else {
          lagoonGlow.addColorStop(0, "rgba(255, 255, 255, 0.04)");
          lagoonGlow.addColorStop(1, "transparent");
        }

        ctx.fillStyle = lagoonGlow;
        ctx.beginPath();
        ctx.arc(atoll3D.x, atoll3D.y, Math.max(radiusScaled, 4), 0, Math.PI * 2);
        ctx.fill();

        // Delicate coral reef rim
        ctx.strokeStyle = atoll.active
          ? isNightMode
            ? "rgba(34, 211, 238, 0.35)"
            : "rgba(43, 188, 208, 0.4)"
          : "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(atoll3D.x, atoll3D.y, Math.max(radiusScaled * 0.65, 3), 0, Math.PI * 2);
        ctx.stroke();
      });

      // 4. MLE Airport Hub
      const mlePt = projectCoords(MLE_AIRPORT.lat, MLE_AIRPORT.lng, width, height);
      const mle3D = apply3DTransform(mlePt.x, mlePt.y, 0, width, height);

      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(mle3D.x, mle3D.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "500 10px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText("MLE Airport Hub", mle3D.x + 8, mle3D.y + 3);

      // 5. Seaplane Flight Corridors (Only highlighted for selected/hovered resort to avoid clutter)
      RESORTS_DATA.forEach((resort) => {
        const isSelected = selectedResort?.id === resort.id;
        const isHovered = hoveredResort?.id === resort.id;

        // Skip drawing when unselected unless hovered to keep canvas pristine
        if (!isSelected && !isHovered) {
          // Subtle, ultra-faint baseline trace
          ctx.beginPath();
          const steps = 15;
          for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const curLat = MLE_AIRPORT.lat + (resort.lat - MLE_AIRPORT.lat) * progress;
            const curLng = MLE_AIRPORT.lng + (resort.lng - MLE_AIRPORT.lng) * progress;
            const pt2D = projectCoords(curLat, curLng, width, height);
            const pt3D = apply3DTransform(pt2D.x, pt2D.y, Math.sin(progress * Math.PI) * 20, width, height);
            if (i === 0) ctx.moveTo(pt3D.x, pt3D.y);
            else ctx.lineTo(pt3D.x, pt3D.y);
          }
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }

        // Active highlighted corridor
        const steps = 30;
        ctx.beginPath();
        let beaconPoint: { x: number; y: number } | null = null;

        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const curLat = MLE_AIRPORT.lat + (resort.lat - MLE_AIRPORT.lat) * progress;
          const curLng = MLE_AIRPORT.lng + (resort.lng - MLE_AIRPORT.lng) * progress;
          const altitudeZ = Math.sin(progress * Math.PI) * 75;

          const pt2D = projectCoords(curLat, curLng, width, height);
          const pt3D = apply3DTransform(pt2D.x, pt2D.y, altitudeZ, width, height);

          if (i === 0) ctx.moveTo(pt3D.x, pt3D.y);
          else ctx.lineTo(pt3D.x, pt3D.y);

          // Plane position
          if (Math.abs(progress - ((t * 0.35) % 1)) < 0.04) {
            beaconPoint = pt3D;
          }
        }

        ctx.strokeStyle = isSelected ? "#22d3ee" : "#facc15";
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Seaplane Beacon
        if (beaconPoint) {
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(beaconPoint.x, beaconPoint.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // 6. Refined Resort Beacons
      RESORTS_DATA.forEach((resort) => {
        const isSelected = selectedResort?.id === resort.id;
        const isHovered = hoveredResort?.id === resort.id;
        const targetPt = projectCoords(resort.lat, resort.lng, width, height);

        const bobZ = 12 + Math.sin(t * 2 + resort.lat * 4) * 4;
        const groundPt = apply3DTransform(targetPt.x, targetPt.y, 0, width, height);
        const floatPt = apply3DTransform(targetPt.x, targetPt.y, bobZ, width, height);

        // Subtle tether line
        ctx.strokeStyle = isSelected ? "#22d3ee" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.moveTo(groundPt.x, groundPt.y);
        ctx.lineTo(floatPt.x, floatPt.y);
        ctx.stroke();

        // Pearl beacon dot
        const dotRadius = (isSelected ? 6.5 : isHovered ? 5.5 : 4) * floatPt.scale;
        ctx.save();
        ctx.fillStyle = resort.color;
        if (isSelected || isHovered) {
          ctx.shadowColor = resort.color;
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.arc(floatPt.x, floatPt.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(floatPt.x, floatPt.y, dotRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Resort label
        const showLabel = isSelected || isHovered || floatPt.scale > 1.05;
        if (showLabel) {
          ctx.save();
          ctx.font = isSelected ? "bold 11px sans-serif" : "500 10px sans-serif";
          const labelY = floatPt.y - dotRadius - 6;

          const textWidth = ctx.measureText(resort.name).width;
          const bgX = floatPt.x - textWidth / 2 - 6;
          const bgY = labelY - 11;

          ctx.fillStyle = isSelected ? "rgba(6, 182, 212, 0.95)" : "rgba(7, 24, 32, 0.85)";
          ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, textWidth + 12, 16, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(resort.name, floatPt.x, labelY);
          ctx.restore();
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [is3DMode, isNightMode, apply3DTransform, projectCoords, selectedResort, hoveredResort]);

  // Pointer & Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (e.shiftKey) {
        setPanX(dragStartRef.current.panX + dx * 0.8);
        setPanY(dragStartRef.current.panY + dy * 0.8);
      } else {
        setYaw(Math.max(-45, Math.min(45, dragStartRef.current.yaw + dx * 0.25)));
        setPitch(Math.max(15, Math.min(68, dragStartRef.current.pitch + dy * 0.25)));
      }
      return;
    }

    // Hover detection
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found: MapResort | null = null;
    RESORTS_DATA.forEach((resort) => {
      const targetPt = projectCoords(resort.lat, resort.lng, canvas.clientWidth, canvas.clientHeight);
      const floatPt = apply3DTransform(targetPt.x, targetPt.y, 16, canvas.clientWidth, canvas.clientHeight);
      const dist = Math.hypot(mouseX - floatPt.x, mouseY - floatPt.y);
      if (dist < 18) {
        found = resort;
      }
    });

    setHoveredResort(found);
    canvas.style.cursor = found ? "pointer" : isDragging ? "grabbing" : "grab";
  };

  const handleMouseUp = () => {
    if (hoveredResort && !isDragging) {
      setSelectedResort(hoveredResort);
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.max(0.7, Math.min(2.8, z + delta)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-[560px] sm:h-[640px] w-full overflow-hidden rounded-3xl border border-border-subtle bg-[#03141c] shadow-2 select-none ${className}`}
    >
      {/* Top Left: Clean Title Pill */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3.5 py-1.5 backdrop-blur-md">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide">
            Maldives 3D Archipelago
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            · 26 Atolls
          </span>
        </div>
      </div>

      {/* Top Right: Single Sleek Minimal Control Pill */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/75 p-1 backdrop-blur-md text-white shadow-lg pointer-events-auto">
        <button
          type="button"
          onClick={() => setIs3DMode((v) => !v)}
          title={is3DMode ? "Switch to 2D Flat Chart" : "Switch to 3D Perspective"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            is3DMode ? "bg-cyan-400 text-[#031520]" : "text-slate-300 hover:text-white"
          }`}
        >
          <Layers size={13} />
          <span>{is3DMode ? "3D" : "2D"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsNightMode((v) => !v)}
          title={isNightMode ? "Switch to Day Lighting" : "Switch to Night Mode"}
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white transition-colors"
        >
          {isNightMode ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-cyan-300" />}
        </button>

        <div className="h-3 w-px bg-white/20" />

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.8, z + 0.2))}
          title="Zoom In"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
          title="Zoom Out"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white transition-colors"
        >
          <ZoomOut size={14} />
        </button>

        <div className="h-3 w-px bg-white/20" />

        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset Camera"
          className="flex size-7 items-center justify-center rounded-full text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw size={13} />
        </button>
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

      {/* Selected Resort Inspector Card (Floating bottom left, clean and minimal) */}
      {selectedResort ? (
        <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-sm z-20 rounded-2xl border border-white/15 bg-slate-950/85 p-5 text-white shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom-2 duration-200">
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
              <h3 className="mt-1 font-display text-lg font-medium text-white leading-tight">
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

          <p className="mt-2 text-xs text-slate-300 leading-relaxed font-light line-clamp-2">
            {selectedResort.summary}
          </p>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
              <Plane size={11} className="text-cyan-300" />
              {selectedResort.transferDuration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5">
              <Gift size={11} className="text-amber-300" />
              {selectedResort.tag}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/10">
            <Button
              asChild
              variant="conversion"
              className="flex-1 rounded-full py-2 text-xs font-semibold"
            >
              <Link href={`/resorts/${selectedResort.slug}`}>
                Explore Resort &rarr;
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-full py-2 text-xs font-semibold border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/plan">Plan Trip</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
