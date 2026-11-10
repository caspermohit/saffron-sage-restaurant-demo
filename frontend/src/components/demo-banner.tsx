"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { DEMO_MODE } from "@/lib/demo-config";

const metadata = z.object({ enabled: z.literal(true), guest_path: z.string().nullable() });

export function DemoBanner() {
  const [guestPath, setGuestPath] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_MODE) return;
    const controller = new AbortController();
    api("/demo", { signal: controller.signal }).then((result) => {
      const parsed = metadata.safeParse(result);
      if (parsed.success && parsed.data.guest_path?.startsWith("/menu/")) {
        setGuestPath(parsed.data.guest_path);
      }
    }).catch(() => { /* The normal staff sign-in remains usable if demo metadata is unavailable. */ });
    return () => controller.abort();
  }, []);

  if (!DEMO_MODE) return null;
  return (
    <aside className="demo-banner" aria-label="Shared demo information">
      <div>
        <strong>Shared test restaurant</strong>
        <span>Sample data only. Other testers may change it. No real payments.</span>
      </div>
      {guestPath && <nav aria-label="Demo shortcuts"><a href={guestPath} target="_blank" rel="noreferrer">Try guest ordering ↗</a></nav>}
    </aside>
  );
}
