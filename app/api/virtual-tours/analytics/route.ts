import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_REQUEST_SIZE = 8 * 1024;
const DUPLICATE_WINDOW_SECONDS = 3;
const EVENT_TYPES = new Set(["tour_view", "scene_view", "whatsapp_click"]);

type AnalyticsRequest = {
  tourId?: unknown;
  eventType?: unknown;
  sceneId?: unknown;
  visitorSessionId?: unknown;
  embedded?: unknown;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getText(value: unknown, maximumLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);

    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return NextResponse.json({ success: false }, { status: 413 });
    }

    const body = (await request.json()) as AnalyticsRequest;
    const tourId = getText(body.tourId, 50);
    const eventType = getText(body.eventType, 30);
    const sceneId = getText(body.sceneId, 50);
    const visitorSessionId = getText(body.visitorSessionId, 50);
    const isEmbedded = body.embedded === true;

    if (
      !isValidUuid(tourId) ||
      !isValidUuid(visitorSessionId) ||
      !EVENT_TYPES.has(eventType) ||
      (eventType === "scene_view" ? !isValidUuid(sceneId) : Boolean(sceneId))
    ) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: tour, error: tourError } = await supabase
      .from("virtual_tours")
      .select("id")
      .eq("id", tourId)
      .eq("status", "published")
      .maybeSingle();

    if (tourError || !tour) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (eventType === "scene_view") {
      const { data: scene, error: sceneError } = await supabase
        .from("virtual_tour_scenes")
        .select("id")
        .eq("id", sceneId)
        .eq("tour_id", tourId)
        .maybeSingle();

      if (sceneError || !scene) {
        return NextResponse.json({ success: false }, { status: 400 });
      }
    }

    const duplicateThreshold = new Date(
      Date.now() - DUPLICATE_WINDOW_SECONDS * 1000
    ).toISOString();

    let duplicateQuery = supabase
      .from("virtual_tour_analytics_events")
      .select("id")
      .eq("tour_id", tourId)
      .eq("event_type", eventType)
      .eq("visitor_session_id", visitorSessionId)
      .gte("created_at", duplicateThreshold)
      .limit(1);

    duplicateQuery = eventType === "scene_view"
      ? duplicateQuery.eq("scene_id", sceneId)
      : duplicateQuery.is("scene_id", null);

    const { data: duplicateEvents, error: duplicateError } = await duplicateQuery;

    if (!duplicateError && (duplicateEvents ?? []).length > 0) {
      return NextResponse.json({ success: true, duplicated: true });
    }

    const { error: insertError } = await supabase
      .from("virtual_tour_analytics_events")
      .insert({
        tour_id: tourId,
        scene_id: eventType === "scene_view" ? sceneId : null,
        event_type: eventType,
        visitor_session_id: visitorSessionId,
        is_embedded: isEmbedded,
      });

    if (insertError) {
      console.error("Erro ao registrar estatística do passeio 360°:", insertError);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro inesperado ao registrar estatística do passeio 360°:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
