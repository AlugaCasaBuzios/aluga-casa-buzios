"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  createVirtualTourAccessCookie,
  getVirtualTourAccessCookieName,
  verifyVirtualTourPassword,
} from "@/lib/virtualTourAccess";

function getFormText(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeSlug(value: string): string {
  return value.trim().toLowerCase().slice(0, 100);
}

async function slowDownFailedAttempt() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 600);
  });
}

export async function unlockVirtualTour(formData: FormData) {
  const slug = getSafeSlug(getFormText(formData, "slug"));
  const password = getFormText(formData, "password").slice(0, 128);
  const isEmbedded = getFormText(formData, "embed") === "1";
  const returnPath = `/tour/${slug}${isEmbedded ? "?embed=1" : ""}`;
  const errorSeparator = isEmbedded ? "&" : "?";

  if (!slug || !password) {
    redirect(`${returnPath}${errorSeparator}erro=senha`);
  }

  const supabase = createSupabaseAdminClient();
  const { data: tour, error: tourError } = await supabase
    .from("virtual_tours")
    .select(
      "id, status, access_mode, access_password_hash, access_expires_at, access_version"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (tourError || !tour || tour.status !== "published") {
    redirect(`${returnPath}${errorSeparator}erro=indisponivel`);
  }

  if (
    tour.access_expires_at &&
    new Date(tour.access_expires_at).getTime() <= Date.now()
  ) {
    redirect(`${returnPath}${errorSeparator}erro=expirado`);
  }

  const { data: service, error: serviceError } = await supabase
    .from("virtual_tour_services")
    .select("service_status")
    .eq("tour_id", tour.id)
    .maybeSingle();

  if (serviceError || (service && service.service_status !== "active")) {
    redirect(`${returnPath}${errorSeparator}erro=indisponivel`);
  }

  if (
    tour.access_mode !== "password" ||
    !verifyVirtualTourPassword(password, tour.access_password_hash)
  ) {
    await slowDownFailedAttempt();
    redirect(`${returnPath}${errorSeparator}erro=senha`);
  }

  const accessCookie = createVirtualTourAccessCookie(
    tour.id,
    tour.access_version,
    tour.access_expires_at
  );
  const cookieStore = await cookies();

  cookieStore.set(
    getVirtualTourAccessCookieName(tour.id),
    accessCookie.value,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: `/tour/${slug}`,
      expires: accessCookie.expires,
    }
  );

  redirect(returnPath);
}
