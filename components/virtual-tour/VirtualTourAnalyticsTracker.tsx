"use client";

import { type CSSProperties, type ReactNode, useEffect } from "react";

import { trackVirtualTourEvent } from "@/lib/virtualTourAnalyticsClient";

type VirtualTourViewTrackerProps = {
  tourId: string;
  embedded?: boolean;
};

type TrackedWhatsappLinkProps = {
  tourId: string;
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function VirtualTourViewTracker({
  tourId,
  embedded = false,
}: VirtualTourViewTrackerProps) {
  useEffect(() => {
    trackVirtualTourEvent({ tourId, eventType: "tour_view", embedded });
  }, [embedded, tourId]);

  return null;
}

export function TrackedWhatsappLink({
  tourId,
  href,
  children,
  className,
  style,
}: TrackedWhatsappLinkProps) {
  function trackClick() {
    trackVirtualTourEvent({ tourId, eventType: "whatsapp_click" });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
