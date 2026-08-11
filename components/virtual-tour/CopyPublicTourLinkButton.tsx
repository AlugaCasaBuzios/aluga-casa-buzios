"use client";

import {
  useState,
} from "react";

type CopyPublicTourLinkButtonProps = {
  path: string;
};

export default function CopyPublicTourLinkButton({
  path,
}: CopyPublicTourLinkButtonProps) {
  const [copied, setCopied] =
    useState(false);

  async function copyLink() {
    const absoluteUrl =
      new URL(
        path,
        window.location.origin
      ).toString();

    try {
      await navigator.clipboard.writeText(
        absoluteUrl
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2500
      );
    } catch (error) {
      console.error(
        "Erro ao copiar link do passeio:",
        error
      );

      window.prompt(
        "Copie o link do passeio:",
        absoluteUrl
      );
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      style={{
        color: "#ffffff",
      }}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-3 font-black text-white shadow-md transition hover:bg-sky-700"
    >
      {copied
        ? "Link copiado!"
        : "Copiar link público"}
    </button>
  );
}
