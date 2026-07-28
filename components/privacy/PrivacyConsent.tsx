"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import AnalyticsEvents from "@/components/analytics/AnalyticsEvents";

type ConsentChoice = "accepted" | "rejected" | null;

interface PrivacyConsentProps {
  gaId?: string;
}

const STORAGE_KEY = "aluga-casa-buzios-cookie-consent-v1";

export default function PrivacyConsent({
  gaId,
}: PrivacyConsentProps) {
  const [consent, setConsent] =
    useState<ConsentChoice>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedConsent =
      window.localStorage.getItem(STORAGE_KEY);

    if (
      savedConsent === "accepted" ||
      savedConsent === "rejected"
    ) {
      setConsent(savedConsent);
    }

    setIsReady(true);
  }, []);

  function saveConsent(choice: Exclude<ConsentChoice, null>) {
    window.localStorage.setItem(
      STORAGE_KEY,
      choice
    );

    setConsent(choice);
  }

  function reopenPreferences() {
    window.localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
  }

  if (!isReady) {
    return null;
  }

  return (
    <>
      {/* Analytics carrega somente após consentimento */}
      {gaId && consent === "accepted" && (
        <>
          <GoogleAnalytics gaId={gaId} />
          <AnalyticsEvents />
        </>
      )}

      {/* Banner de consentimento */}
      {consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-[300] border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] backdrop-blur sm:p-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-lg font-bold text-blue-950">
                Privacidade e cookies
              </p>

              <p className="mt-2 leading-7 text-zinc-600">
                Usamos cookies analíticos para entender
                como o site é utilizado e melhorar sua
                experiência. O Google Analytics será
                ativado somente com sua autorização.
              </p>

              <Link
                href="/privacidade"
                className="mt-2 inline-flex font-semibold text-sky-700 transition hover:text-sky-900"
              >
                Consulte nossa Política de Privacidade
              </Link>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-none">
              <button
                type="button"
                onClick={() => saveConsent("rejected")}
                className="rounded-full border border-blue-950 px-6 py-3 font-bold text-blue-950 transition hover:bg-blue-50"
              >
                Recusar cookies analíticos
              </button>

              <button
                type="button"
                onClick={() => saveConsent("accepted")}
                className="rounded-full bg-blue-950 px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-900"
              >
                Aceitar cookies analíticos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão para mudar a escolha */}
      {consent !== null && (
        <button
          type="button"
          onClick={reopenPreferences}
          className="fixed bottom-4 left-4 z-[180] rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-blue-950 shadow-lg transition hover:bg-zinc-50"
        >
          Preferências de cookies
        </button>
      )}
    </>
  );
}