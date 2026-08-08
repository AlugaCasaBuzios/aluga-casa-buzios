import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import HomeContent from "@/components/home/HomeContent";

import {
  getActiveProperties,
} from "@/lib/propertyCatalog";

export const dynamic =
  "force-dynamic";

export default async function Home() {
  const properties =
    await getActiveProperties();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <HomeContent
          properties={properties}
        />
      </main>

      <Footer />
    </>
  );
}
