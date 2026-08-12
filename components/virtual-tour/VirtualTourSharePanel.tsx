"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import QRCode from "qrcode";

type VirtualTourSharePanelProps = {
  path: string;
  slug: string;
  title: string;
  accessMode: string;
  accessExpiresAt: string | null;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function escapeHtmlAttribute(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function VirtualTourSharePanel({
  path,
  slug,
  title,
  accessMode,
  accessExpiresAt,
}: VirtualTourSharePanelProps) {
  const [origin, setOrigin] =
    useState("");

  const [qrCodeUrl, setQrCodeUrl] =
    useState("");

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  const publicUrl =
    origin
      ? new URL(
          path,
          origin
        ).toString()
      : path;

  const embedUrl =
    origin
      ? new URL(
          `${path}?embed=1`,
          origin
        ).toString()
      : `${path}?embed=1`;

  const embedCode =
    useMemo(
      () =>
        `<iframe src="${embedUrl}" title="${escapeHtmlAttribute(
          title
        )}" width="100%" height="650" style="border:0;border-radius:16px;overflow:hidden" loading="lazy" allow="fullscreen; gyroscope" allowfullscreen></iframe>`,
      [
        embedUrl,
        title,
      ]
    );

  useEffect(() => {
    const currentOrigin =
      window.location.origin;

    setOrigin(
      currentOrigin
    );
  }, []);

  useEffect(() => {
    if (!origin) {
      return;
    }

    let cancelled = false;

    async function createQrCode() {
      try {
        const dataUrl =
          await QRCode.toDataURL(
            publicUrl,
            {
              width: 560,
              margin: 2,
              errorCorrectionLevel:
                "H",
              color: {
                dark: "#172554",
                light: "#FFFFFF",
              },
            }
          );

        if (!cancelled) {
          setQrCodeUrl(
            dataUrl
          );
        }
      } catch (error) {
        console.error(
          "Erro ao gerar QR Code do passeio:",
          error
        );

        if (!cancelled) {
          setFeedback({
            type: "error",
            message:
              "Não foi possível gerar o QR Code.",
          });
        }
      }
    }

    void createQrCode();

    return () => {
      cancelled = true;
    };
  }, [
    origin,
    publicUrl,
  ]);

  function clearFeedbackLater() {
    window.setTimeout(
      () => {
        setFeedback(null);
      },
      3000
    );
  }

  async function copyValue(
    value: string,
    successMessage: string
  ) {
    try {
      await navigator.clipboard.writeText(
        value
      );

      setFeedback({
        type: "success",
        message:
          successMessage,
      });

      clearFeedbackLater();
    } catch (error) {
      console.error(
        "Erro ao copiar dados do passeio:",
        error
      );

      window.prompt(
        "Copie o conteúdo abaixo:",
        value
      );
    }
  }

  function downloadQrCode() {
    if (!qrCodeUrl) {
      return;
    }

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      qrCodeUrl;
    anchor.download =
      `${slug}-qr-code.png`;
    anchor.click();

    setFeedback({
      type: "success",
      message:
        "QR Code baixado com sucesso.",
    });

    clearFeedbackLater();
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg">
      <h2 className="text-lg font-black text-blue-950">
        Compartilhar e incorporar
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Envie o link, baixe o QR Code ou coloque o passeio dentro de outro site.
      </p>

      {accessMode === "password" && (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-black">Link protegido por senha</p>
          <p className="mt-1 leading-5">
            Envie a senha separadamente ao cliente. O QR Code e o código de incorporação usarão esta mesma proteção.
          </p>
        </div>
      )}

      {accessExpiresAt && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-black">Validade: </span>
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Sao_Paulo",
          }).format(new Date(accessExpiresAt))}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodeUrl}
            alt={`QR Code do passeio ${title}`}
            className="h-auto w-full max-w-56 rounded-xl bg-white"
          />
        ) : (
          <div className="flex aspect-square w-full max-w-56 items-center justify-center rounded-xl bg-white px-5 text-center text-sm font-bold text-slate-500">
            Gerando QR Code...
          </div>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor={`public-tour-url-${slug}`}
          className="text-sm font-black text-slate-800"
        >
          Link do passeio
        </label>

        <input
          id={`public-tour-url-${slug}`}
          type="text"
          readOnly
          value={publicUrl}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            void copyValue(
              publicUrl,
              "Link do passeio copiado!"
            )
          }
          style={{
            color: "#ffffff",
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"
        >
          Copiar link
        </button>

        <button
          type="button"
          disabled={!qrCodeUrl}
          onClick={downloadQrCode}
          style={{
            color: "#172554",
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-950 bg-white px-4 py-2 text-sm font-black text-blue-950 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          Baixar QR Code
        </button>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <label
          htmlFor={`embed-tour-code-${slug}`}
          className="text-sm font-black text-slate-800"
        >
          Código para colocar em outro site
        </label>

        <textarea
          id={`embed-tour-code-${slug}`}
          readOnly
          rows={7}
          value={embedCode}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-green-300"
        />

        <button
          type="button"
          onClick={() =>
            void copyValue(
              embedCode,
              "Código de incorporação copiado!"
            )
          }
          style={{
            color: "#ffffff",
          }}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-950 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900"
        >
          Copiar código de incorporação
        </button>

        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#172554",
          }}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-950 bg-white px-4 py-2 text-center text-sm font-black text-blue-950 transition hover:bg-sky-50"
        >
          Testar visualização incorporada
        </a>
      </div>
    </section>
  );
}
