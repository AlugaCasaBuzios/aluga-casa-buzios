"use client";

import { useState } from "react";

type CopyLinkButtonProps = {
  path: string;
  label?: string;
};

/**
 * Copia um link absoluto montado a partir
 * do endereço em que o painel está aberto.
 */
export default function CopyLinkButton({
  path,
  label = "Copiar link",
}: CopyLinkButtonProps) {
  const [copied, setCopied] =
    useState(false);

  async function copyLink() {
    const absoluteUrl = new URL(
      path,
      window.location.origin
    ).toString();

    try {
      await navigator.clipboard.writeText(
        absoluteUrl
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      window.prompt(
        "Copie o link:",
        absoluteUrl
      );
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="rounded-xl bg-blue-950 px-5 py-3 font-bold text-white transition hover:bg-blue-900"
    >
      {copied ? "Link copiado!" : label}
    </button>
  );
}
