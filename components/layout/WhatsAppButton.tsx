export default function WhatsAppButton() {
  const message =
    "Olá! Gostaria de conhecer as casas disponíveis para temporada em Búzios.";

  const whatsappUrl = `https://wa.me/5524998288846?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Aluga Casa Búzios pelo WhatsApp"
      className="
        fixed bottom-6 right-6 z-[100]
        flex h-16 w-16 items-center justify-center
        rounded-full bg-green-600
        text-3xl text-white
        shadow-2xl
        transition duration-300
        hover:-translate-y-1 hover:scale-105 hover:bg-green-700
        focus:outline-none focus:ring-4 focus:ring-green-300
      "
    >
      <span aria-hidden="true">💬</span>

      <span className="absolute right-16 hidden whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-lg md:block">
        Fale conosco
      </span>
    </a>
  );
}