"use client";

import {
  useEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
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

function getPropertyFromPathname(
  pathname: string
): string | null {
  const pathParts = pathname
    .split("/")
    .filter(Boolean);

  if (
    pathParts.length !== 2 ||
    pathParts[0] !== "imoveis"
  ) {
    return null;
  }

  try {
    return decodeURIComponent(
      pathParts[1]
    );
  } catch {
    return pathParts[1];
  }
}

function getPropertyTitle(
  propertyId: string
): string {
  const pageTitle =
    document.title.trim();

  const withoutBrand =
    pageTitle.split(
      " | Aluga Casa Búzios"
    )[0];

  const withoutDescription =
    withoutBrand.split(
      " — Casa de temporada"
    )[0];

  return (
    withoutDescription.trim() ||
    propertyId
  );
}

function getPropertyListDetails(
  pagePath: string
): {
  id: string;
  name: string;
} {
  if (pagePath === "/") {
    return {
      id: "home_properties",
      name: "Imóveis da página inicial",
    };
  }

  if (pagePath === "/casas") {
    return {
      id: "properties_catalog",
      name: "Catálogo de imóveis",
    };
  }

  if (
    pagePath.startsWith(
      "/imoveis/"
    )
  ) {
    return {
      id: "related_properties",
      name: "Imóveis relacionados",
    };
  }

  return {
    id: "property_cards",
    name: "Lista de imóveis",
  };
}

export default function AnalyticsEvents() {
  const pathname = usePathname();

  const lastTrackedPropertyPath =
    useRef<string | null>(null);

  /*
   * Registra a visualização de uma
   * página de imóvel.
   */
  useEffect(() => {
    const propertyId =
      getPropertyFromPathname(
        pathname
      );

    if (!propertyId) {
      lastTrackedPropertyPath.current =
        null;

      return;
    }

    if (
      lastTrackedPropertyPath.current ===
      pathname
    ) {
      return;
    }

    /*
     * Aguarda o Google Analytics
     * terminar de carregar.
     */
    const timeoutId =
      window.setTimeout(() => {
        if (
          lastTrackedPropertyPath.current ===
          pathname
        ) {
          return;
        }

        lastTrackedPropertyPath.current =
          pathname;

        const propertyTitle =
          getPropertyTitle(
            propertyId
          );

        sendGAEvent(
          "event",
          "view_item",
          {
            property_id: propertyId,

            property_title:
              propertyTitle,

            page_path: pathname,

            items: [
              {
                item_id: propertyId,

                item_name:
                  propertyTitle,

                item_category:
                  "Casa de temporada",
              },
            ],
          }
        );
      }, 3000);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [pathname]);

  /*
   * Registra cliques importantes.
   */
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

      /*
       * Registra qual cartão de
       * imóvel foi escolhido.
       */
      if (
        link.dataset
          .analyticsEvent ===
        "select_item"
      ) {
        const propertyId =
          link.dataset
            .propertyId ??
          "nao_informado";

        const propertyTitle =
          link.dataset
            .propertyTitle ??
          "Imóvel";

        const propertyNeighborhood =
          link.dataset
            .propertyNeighborhood ??
          "Armação dos Búzios";

        const propertyPrice =
          parseNumericValue(
            link.dataset
              .propertyPrice
          );

        const propertyList =
          getPropertyListDetails(
            pagePath
          );

        sendGAEvent(
          "event",
          "select_item",
          {
            item_list_id:
              propertyList.id,

            item_list_name:
              propertyList.name,

            property_id:
              propertyId,

            property_title:
              propertyTitle,

            page_path: pagePath,

            ...(propertyPrice !==
            undefined
              ? {
                  currency: "BRL",
                  value:
                    propertyPrice,
                }
              : {}),

            items: [
              {
                item_id:
                  propertyId,

                item_name:
                  propertyTitle,

                item_category:
                  "Casa de temporada",

                item_category2:
                  propertyNeighborhood,

                item_list_id:
                  propertyList.id,

                item_list_name:
                  propertyList.name,

                ...(propertyPrice !==
                undefined
                  ? {
                      price:
                        propertyPrice,
                    }
                  : {}),
              },
            ],
          }
        );

        return;
      }

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
            link.dataset
              .quoteTotal
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

            nights:
              nights ?? 0,

            guests:
              guests ?? 0,

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