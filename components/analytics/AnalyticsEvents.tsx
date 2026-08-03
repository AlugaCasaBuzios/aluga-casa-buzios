"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

function getSafeLinkUrl(
  linkUrl: string
): string {
  try {
    const url = new URL(linkUrl);

    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function getAirbnbDestination(
  linkUrl: string
): string {
  try {
    const url = new URL(linkUrl);

    const pathParts = url.pathname
      .split("/")
      .filter(Boolean);

    if (
      pathParts[0] === "h" &&
      pathParts[1]
    ) {
      return pathParts[1];
    }

    if (pathParts[0] === "p") {
      return "perfil_aluga_casa_buzios";
    }

    return "airbnb";
  } catch {
    return "airbnb";
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

function isGoogleMapsUrl(
  linkUrl: string
): boolean {
  try {
    const url = new URL(linkUrl);

    const hostname =
      url.hostname.toLowerCase();

    const isGoogleDomain =
      hostname === "google.com" ||
      hostname === "www.google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "google.com.br" ||
      hostname === "www.google.com.br" ||
      hostname.endsWith(".google.com.br");

    const isGoogleMapsPath =
      url.pathname.startsWith("/maps");

    const isGoogleMapsShortLink =
      hostname === "maps.app.goo.gl";

    return (
      (isGoogleDomain &&
        isGoogleMapsPath) ||
      isGoogleMapsShortLink
    );
  } catch {
    return false;
  }
}

export default function AnalyticsEvents() {
  useEffect(() => {
    function handleClick(
      event: MouseEvent
    ) {
      const clickedElement =
        event.target;

      if (
        !(
          clickedElement instanceof
          Element
        )
      ) {
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

      const linkText =
        link.textContent
          ?.trim()
          .replace(/\s+/g, " ")
          .slice(0, 100) ||
        "Link externo";

      const pagePath =
        window.location.pathname;

      const isAirbnbLink =
        linkUrl.includes(
          "airbnb.com.br/"
        ) ||
        linkUrl.includes(
          "airbnb.com/"
        );

      /*
       * Registra cliques em anúncios
       * e no perfil do Airbnb.
       */
      if (isAirbnbLink) {
        sendGAEvent(
          "event",
          "airbnb_click",
          {
            link_url:
              getSafeLinkUrl(
                linkUrl
              ),
            link_text: linkText,
            airbnb_destination:
              getAirbnbDestination(
                linkUrl
              ),
            page_path: pagePath,
          }
        );

        return;
      }

      const isMapLink =
        link.dataset
          .analyticsEvent ===
          "map_click" ||
        isGoogleMapsUrl(linkUrl);

      /*
       * Registra o interesse do
       * visitante na localização
       * aproximada do imóvel.
       *
       * Coordenadas e endereço não
       * são enviados ao Analytics.
       */
      if (isMapLink) {
        sendGAEvent(
          "event",
          "map_click",
          {
            link_url:
              getSafeLinkUrl(
                linkUrl
              ),
            link_text: linkText,
            property_id:
              link.dataset
                .propertyId ??
              "nao_informado",
            property_title:
              link.dataset
                .propertyTitle ??
              "Imóvel",
            page_path: pagePath,
          }
        );

        return;
      }

      const isWhatsAppLink =
        linkUrl.includes("wa.me/") ||
        linkUrl.includes(
          "api.whatsapp.com/"
        ) ||
        linkUrl.includes(
          "whatsapp.com/send"
        );

      if (!isWhatsAppLink) {
        return;
      }

      /*
       * Consulta calculada na
       * página de um imóvel.
       */
      if (
        link.dataset
          .analyticsEvent ===
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
            value:
              quoteTotal ?? 0,
            lead_source:
              "whatsapp_quote",
            property_id:
              link.dataset
                .propertyId ??
              "nao_informado",
            property_title:
              link.dataset
                .propertyTitle ??
              "Imóvel",
            nights: nights ?? 0,
            guests: guests ?? 0,
            page_path: pagePath,
          }
        );
      }

      /*
       * Registra qualquer clique
       * em um link do WhatsApp.
       */
      sendGAEvent(
        "event",
        "whatsapp_click",
        {
          link_url:
            getSafeLinkUrl(
              linkUrl
            ),
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