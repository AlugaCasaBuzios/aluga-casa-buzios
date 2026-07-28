"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

export default function AnalyticsEvents() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const clickedElement = event.target;

      if (!(clickedElement instanceof Element)) {
        return;
      }

      const link = clickedElement.closest<HTMLAnchorElement>("a[href]");

      if (!link) {
        return;
      }

      const linkUrl = link.href;

      const isWhatsAppLink =
        linkUrl.includes("wa.me/") ||
        linkUrl.includes("api.whatsapp.com/") ||
        linkUrl.includes("whatsapp.com/send");

      if (!isWhatsAppLink) {
        return;
      }

      const linkText =
        link.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ||
        "WhatsApp";

      sendGAEvent("event", "whatsapp_click", {
        link_url: linkUrl,
        link_text: linkText,
        page_path: window.location.pathname,
      });
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}