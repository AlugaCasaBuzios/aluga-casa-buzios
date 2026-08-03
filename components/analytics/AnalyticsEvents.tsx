"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

function getSafeLinkUrl(linkUrl: string) {
  try {
    const url = new URL(linkUrl);

    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function parseNumericValue(
  value: string | undefined
): number | undefined {
  if (!value) {
    return undefined;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
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

      const pagePath =
        window.location.pathname;

      const linkText =
        link.textContent
          ?.trim()
          .replace(/\s+/g, " ")
          .slice(0, 100) || "WhatsApp";

      /*
       * Cotação calculada.
       * Enviamos primeiro e somente com
       * parâmetros simples.
       */
      if (
        link.dataset.analyticsEvent ===
        "generate_lead"
      ) {
        const quoteTotal =
          parseNumericValue(
            link.dataset.quoteTotal
          );

        const nights =
          parseNumericValue(
            link.dataset.nights
          );

        const guests =
          parseNumericValue(
            link.dataset.guests
          );

        sendGAEvent(
          "event",
          "generate_lead",
          {
            currency: "BRL",
            value: quoteTotal ?? 0,
            lead_source:
              "whatsapp_quote",
            property_id:
              link.dataset.propertyId ??
              "nao_informado",
            property_title:
              link.dataset.propertyTitle ??
              "Imóvel",
            nights: nights ?? 0,
            guests: guests ?? 0,
            page_path: pagePath,
          }
        );
      }

      /*
       * Todo clique em um botão do WhatsApp.
       */
      sendGAEvent(
        "event",
        "whatsapp_click",
        {
          link_url:
            getSafeLinkUrl(linkUrl),
          link_text: linkText,
          page_path: pagePath,
        }
      );
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