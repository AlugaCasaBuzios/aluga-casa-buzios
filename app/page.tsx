import Header from "@/components/layout/Header";
import HomeContent from "@/components/home/HomeContent";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <HomeContent />
      </main>

      <Footer />
    </>
  );
}