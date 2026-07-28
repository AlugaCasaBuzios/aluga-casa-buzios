import type { Metadata } from "next";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CasasContent from "@/components/casas/CasasContent";

export const metadata: Metadata = {
  title: "Casas para temporada",
  description:
    "Pesquise casas disponíveis para temporada em Armação dos Búzios por nome, bairro, quantidade de hóspedes e comodidades.",
};

export default function CasasPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <CasasContent />
      </main>

      <Footer />
    </>
  );
}