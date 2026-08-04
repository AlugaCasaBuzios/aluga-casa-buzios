"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

interface PropertyShareProps {
  propertyId: string;
  propertyTitle: string;
}

type ShareFeedback =
  | "idle"
  | "copied"
  | "error";

type ShareMethod =
  | "native_share"
  | "copy_link";

export default function PropertyShare({
  propertyId,
  propertyTitle,
}: PropertyShareProps) {
  const [feedback, setFeedback] =
    useState<ShareFeedback>("idle");

  function clearFeedback() {
    window.setTimeout(() => {
      setFeedback("idle");
    }, 3000);
  }

  function trackShare(
    method: ShareMethod
  ) {
    sendGAEvent(
      "event",
      "share",
      {
        method,
        content_type: "property",
        item_id: propertyId,
        property_title:
          propertyTitle,
        page_path:
          window.location.pathname,
      }
    );
  }

  async function copyPropertyLink(
    propertyUrl: string
  ) {
    try {
      await navigator.clipboard.writeText(
        propertyUrl
      );

      setFeedback("copied");

      trackShare("copy_link");

      clearFeedback();
    } catch {
      setFeedback("error");
      clearFeedback();
    }
  }

  async function handleShare() {
    const propertyUrl =
      `${window.location.origin}/imoveis/${propertyId}`;

    const shareData = {
      title: propertyTitle,

      text:
        `Conheça este imóvel da Aluga Casa Búzios: ${propertyTitle}`,

      url: propertyUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(
          shareData
        );

        trackShare(
          "native_share"
        );

        return;
      } catch (error) {
        const wasCancelled =
          error instanceof DOMException &&
          error.name === "AbortError";

        if (wasCancelled) {
          return;
        }
      }
    }

    await copyPropertyLink(
      propertyUrl
    );
  }

  const buttonText =
    feedback === "copied"
      ? "Link copiado!"
      : feedback === "error"
        ? "Não foi possível copiar"
        : "Compartilhar este imóvel";

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-blue-950 bg-white px-6 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-950 hover:text-white"
      aria-label={`Compartilhar o imóvel ${propertyTitle}`}
    >
      <span aria-hidden="true">
        {feedback === "copied"
          ? "✓"
          : "↗"}
      </span>

      <span aria-live="polite">
        {buttonText}
      </span>
    </button>
  );
}