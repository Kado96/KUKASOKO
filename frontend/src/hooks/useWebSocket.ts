import { useEffect, useRef, useCallback } from "react";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .replace(/^http/, "ws");

/**
 * Hook for real-time chat via WebSocket.
 * Connects to ws://<backend>/ws/chat/<userId>?token=<JWT>
 */
export function useChatWebSocket(
  userId: number | null,
  onMessage: (data: object) => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem("kukasoko_token");
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/chat/${userId}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch (_) {}
    };

    ws.onerror = (e) => console.error("[ChatWS] error", e);

    return () => {
      ws.close();
    };
  }, [userId]);

  const sendMessage = useCallback(
    (payload: { receiver_id: number; content: string; listing_id?: number; message_type?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    },
    []
  );

  return { sendMessage };
}

/**
 * Hook for real-time GPS tracking (delivery driver side).
 * Streams navigator.geolocation to ws://<backend>/ws/delivery/<sessionId>?token=<JWT>&role=driver
 */
export function useDriverTracking(sessionId: number | null, active: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || !active) {
      wsRef.current?.close();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      return;
    }

    const token = localStorage.getItem("kukasoko_token");
    if (!token) return;

    const ws = new WebSocket(
      `${WS_BASE}/ws/delivery/${sessionId}?token=${token}&role=driver`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              })
            );
          }
        },
        (err) => console.error("[GPS]", err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    };

    return () => {
      ws.close();
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [sessionId, active]);
}

/**
 * Hook for client side — receives real-time driver position.
 */
export function useDeliveryTracking(
  sessionId: number | null,
  onPosition: (lat: number, lng: number) => void
) {
  useEffect(() => {
    if (!sessionId) return;
    const token = localStorage.getItem("kukasoko_token");
    if (!token) return;

    const ws = new WebSocket(
      `${WS_BASE}/ws/delivery/${sessionId}?token=${token}&role=client`
    );

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "position") {
          onPosition(data.latitude, data.longitude);
        }
      } catch (_) {}
    };

    return () => ws.close();
  }, [sessionId]);
}
