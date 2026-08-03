"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

function getSafeLinkUrl(linkUrl: string): string {
  try {
    const url = new URL(linkUrl);

    return `${url.origin}${url.pathname}`;
  } catch {
    return "WhatsApp";
  }
}

function parseNumericValue(
  value: string | undefined
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : undefined;
}

export default function AnalyticsEvents() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const clickedElement = event.target;

      if (!(clickedElement instanceof Element)) {
        return;
      }

      const link =
        clickedElement.closest<HTMLAnchorElement>(
          "a[href]"
        );

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
        link.textContent
          ?.trim()
          .replace(/\s+/g, " ")
          .slice(0, 100) || "WhatsApp";

      const safeLinkUrl =
        getSafeLinkUrl(linkUrl);

      sendGAEvent("event", "whatsapp_click", {
        link_url: safeLinkUrl,
        link_text: linkText,
        page_path: window.location.pathname,
      });

      if (
        link.dataset.analyticsEvent !==
        "generate_lead"
      ) {
        return;
      }

      const quoteTotal = parseNumericValue(
        link.dataset.quoteTotal
      );

      const nights = parseNumericValue(
        link.dataset.nights
      );

      const guests = parseNumericValue(
        link.dataset.guests
      );

      const propertyId =
        link.dataset.propertyId || "unknown";

      const propertyTitle =
        link.dataset.propertyTitle ||
        "Imóvel não identificado";

      sendGAEvent("event", "generate_lead", {
        currency: "BRL",
        ...(quoteTotal !== undefined
          ? {
              value: quoteTotal,
            }
          : {}),
        lead_source: "whatsapp_quote",
        property_id: propertyId,
        property_title: propertyTitle,
        check_in: link.dataset.checkIn || "",
        check_out: link.dataset.checkOut || "",
        nights: nights ?? 0,
        guests: guests ?? 0,
        page_path: window.location.pathname,
        items: [
          {
            item_id: propertyId,
            item_name: propertyTitle,
            ...(quoteTotal !== undefined
              ? {
                  price: quoteTotal,
                }
              : {}),
            quantity: 1,
          },
        ],
      });
    }

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, []);

  return null;
}