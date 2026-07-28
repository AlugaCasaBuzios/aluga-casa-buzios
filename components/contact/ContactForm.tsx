"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const whatsappMessage = [
      "Olá! Gostaria de consultar uma hospedagem em Búzios.",
      "",
      `Nome: ${name}`,
      `Check-in: ${checkin || "A definir"}`,
      `Check-out: ${checkout || "A definir"}`,
      `Hóspedes: ${guests || "A definir"}`,
      `Mensagem: ${message || "Gostaria de conhecer as casas disponíveis."}`,
    ].join("\n");

    const whatsappUrl = `https://wa.me/5524998288846?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl sm:p-9"
    >
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Solicite atendimento
        </p>

        <h2 className="mt-3 text-3xl font-bold text-blue-950">
          Conte sobre sua viagem
        </h2>

        <p className="mt-3 leading-7 text-zinc-600">
          Preencha os dados abaixo. Ao enviar, sua mensagem será aberta no
          WhatsApp.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block font-semibold text-zinc-800"
          >
            Seu nome
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Digite seu nome"
            required
            className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="checkin"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Data de entrada
            </label>

            <input
              id="checkin"
              type="date"
              value={checkin}
              onChange={(event) => setCheckin(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="checkout"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Data de saída
            </label>

            <input
              id="checkout"
              type="date"
              value={checkout}
              min={checkin || undefined}
              onChange={(event) => setCheckout(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-900 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="guests"
            className="mb-2 block font-semibold text-zinc-800"
          >
            Quantidade de hóspedes
          </label>

          <input
            id="guests"
            type="number"
            min="1"
            max="30"
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            placeholder="Exemplo: 6"
            className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="mb-2 block font-semibold text-zinc-800"
          >
            Mensagem
          </label>

          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Conte quais características você procura na casa..."
            rows={5}
            className="w-full resize-none rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-green-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
        >
          Enviar pelo WhatsApp
        </button>
      </div>
    </form>
  );
}