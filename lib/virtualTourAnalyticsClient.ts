export type VirtualTourAnalyticsEventType =
  | "tour_view"
  | "scene_view"
  | "whatsapp_click";

type TrackVirtualTourEventOptions = {
  tourId: string;
  eventType: VirtualTourAnalyticsEventType;
  sceneId?: string;
  embedded?: boolean;
};

const SESSION_STORAGE_PREFIX =
  "virtual-tour-session:";

function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const randomValue = Math.floor(Math.random() * 16);
      const value = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;
      return value.toString(16);
    }
  );
}

function getVisitorSessionId(tourId: string): string {
  const storageKey = `${SESSION_STORAGE_PREFIX}${tourId}`;

  try {
    const currentValue = window.sessionStorage.getItem(storageKey);

    if (currentValue) {
      return currentValue;
    }

    const sessionId = createSessionId();
    window.sessionStorage.setItem(storageKey, sessionId);
    return sessionId;
  } catch {
    return createSessionId();
  }
}

export function trackVirtualTourEvent({
  tourId,
  eventType,
  sceneId,
  embedded = false,
}: TrackVirtualTourEventOptions): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify({
    tourId,
    eventType,
    sceneId: sceneId ?? null,
    visitorSessionId: getVisitorSessionId(tourId),
    embedded,
  });

  const endpoint = "/api/virtual-tours/analytics";

  if (typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      endpoint,
      new Blob([payload], { type: "application/json" })
    );

    if (sent) {
      return;
    }
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    cache: "no-store",
  }).catch((error) => {
    console.error("Não foi possível registrar a estatística do passeio:", error);
  });
}
