"use client";

import { useEffect } from "react";
import { rememberLandingPath } from "@/lib/planner/local";

export function LandingCapture() {
  useEffect(() => {
    rememberLandingPath();
  }, []);
  return null;
}
