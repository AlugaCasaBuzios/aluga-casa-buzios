"use client";

import Image from "next/image";
import { useState } from "react";

interface PropertyCardImageProps {
  src: string;
  alt: string;
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

export default function PropertyCardImage({
  src,
  alt,
}: PropertyCardImageProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-sky-800 to-sky-600 px-6 text-center text-white">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl shadow-lg backdrop-blur">
          🏠
        </div>

        <p className="mt-5 text-xl font-bold">
          {alt}
        </p>

        <p className="mt-2 text-sm text-white/75">
          Foto em atualização
        </p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover transition duration-500 group-hover:scale-105"
      unoptimized={shouldSkipImageOptimization(src)}
      onError={() => setImageError(true)}
    />
  );
}