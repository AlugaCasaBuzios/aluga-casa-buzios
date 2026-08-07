"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { Property } from "@/types/Property";

interface PropertyGalleryProps {
  property: Property;
}

function shouldSkipImageOptimization(src: string) {
  try {
    const url = new URL(src);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith(
        "/storage/v1/object/public/property-photos/"
      )
    );
  } catch {
    return false;
  }
}

export default function PropertyGallery({
  property,
}: PropertyGalleryProps) {
  const images = useMemo(() => {
    const galleryImages = property.gallery.filter(
      (image) => typeof image === "string" && image.trim() !== ""
    );

    if (galleryImages.length > 0) {
      return galleryImages;
    }

    return [property.image];
  }, [property.gallery, property.image]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const selectedImage = images[selectedIndex];

  function showPreviousImage() {
    setSelectedIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function showNextImage() {
    setSelectedIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  function openGallery(index = selectedIndex) {
    setSelectedIndex(index);
    setGalleryOpen(true);
  }

  function closeGallery() {
    setGalleryOpen(false);
  }

  useEffect(() => {
    setSelectedIndex(0);
  }, [property.id]);

  useEffect(() => {
    if (!galleryOpen) {
      return;
    }

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowLeft" && images.length > 1) {
        showPreviousImage();
      }

      if (event.key === "ArrowRight" && images.length > 1) {
        showNextImage();
      }
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyboard);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [galleryOpen, images.length]);

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-8">
        {/* Foto principal */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-zinc-200 shadow-lg">
          <button
            type="button"
            onClick={() => openGallery()}
            className="relative block h-[380px] w-full overflow-hidden text-left sm:h-[500px] lg:h-[600px]"
            aria-label={`Abrir galeria de fotos de ${property.title}`}
          >
            <Image
              src={selectedImage}
              alt={`${property.title} — foto ${selectedIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              unoptimized={shouldSkipImageOptimization(selectedImage)}
            />

            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>

          {/* Contador */}
          <div className="absolute left-5 top-5 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur">
            {selectedIndex + 1} de {images.length}
          </div>

          {/* Botão para abrir */}
          <button
            type="button"
            onClick={() => openGallery()}
            className="absolute bottom-5 right-5 rounded-full bg-white px-5 py-3 font-bold text-blue-950 shadow-xl transition hover:-translate-y-1 hover:bg-zinc-100"
          >
            🖼️ Ver todas as fotos
          </button>

          {/* Seta esquerda */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={showPreviousImage}
              aria-label="Mostrar foto anterior"
              className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-blue-950 shadow-xl transition hover:scale-105 hover:bg-white"
            >
              ‹
            </button>
          )}

          {/* Seta direita */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={showNextImage}
              aria-label="Mostrar próxima foto"
              className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-blue-950 shadow-xl transition hover:scale-105 hover:bg-white"
            >
              ›
            </button>
          )}
        </div>

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="mt-5 flex gap-3 overflow-x-auto pb-3">
            {images.map((image, index) => {
              const isSelected = selectedIndex === index;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Mostrar foto ${index + 1}`}
                  className={`relative h-24 w-32 flex-none overflow-hidden rounded-2xl border-4 bg-zinc-200 transition ${
                    isSelected
                      ? "border-sky-600 shadow-lg"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${property.title} — miniatura ${index + 1}`}
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized={shouldSkipImageOptimization(image)}
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Galeria em tela cheia */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de fotos de ${property.title}`}
        >
          {/* Cabeçalho da galeria */}
          <div className="flex h-20 items-center justify-between border-b border-white/15 px-5 text-white sm:px-8">
            <div>
              <p className="font-bold">
                {property.title}
              </p>

              <p className="mt-1 text-sm text-white/65">
                Foto {selectedIndex + 1} de {images.length}
              </p>
            </div>

            <button
              type="button"
              onClick={closeGallery}
              aria-label="Fechar galeria"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          {/* Imagem ampliada */}
          <div className="relative flex-1">
            <Image
              src={selectedImage}
              alt={`${property.title} — foto ampliada ${selectedIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain p-4 sm:p-8"
              priority
              unoptimized={shouldSkipImageOptimization(selectedImage)}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Mostrar foto anterior"
                  className="absolute left-4 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white backdrop-blur transition hover:bg-white/25 sm:left-8"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Mostrar próxima foto"
                  className="absolute right-4 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-4xl text-white backdrop-blur transition hover:bg-white/25 sm:right-8"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Miniaturas da galeria ampliada */}
          {images.length > 1 && (
            <div className="border-t border-white/15 px-4 py-4 sm:px-8">
              <div className="mx-auto flex max-w-5xl gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => {
                  const isSelected = selectedIndex === index;

                  return (
                    <button
                      key={`fullscreen-${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      aria-label={`Abrir foto ${index + 1}`}
                      className={`relative h-16 w-24 flex-none overflow-hidden rounded-xl border-2 transition ${
                        isSelected
                          ? "border-sky-400 opacity-100"
                          : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${property.title} — miniatura ampliada ${
                          index + 1
                        }`}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized={shouldSkipImageOptimization(image)}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}