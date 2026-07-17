"""
WebSocket Manager — Chat temps réel & Partage de position GPS.

Deux endpoints :
  WS /ws/chat/{user_id}?token=<JWT>
  WS /ws/delivery/{session_id}?token=<JWT>
"""

from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Set
import json
from datetime import datetime
from jose import jwt, JWTError

from app.database import get_db, settings
from app import models

router = APIRouter()

# ─── Connection Managers ───────────────────────────────────────────────────────

class ChatManager:
    """Gère les connexions WebSocket pour le chat."""

    def __init__(self):
        # user_id -> set of WebSocket connections (multi-tab support)
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: int, data: dict):
        """Envoyer un message à toutes les connexions d'un utilisateur."""
        if user_id in self.active:
            dead = set()
            for ws in self.active[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active[user_id].discard(ws)


class DeliveryManager:
    """Gère les sessions de suivi de livraison en temps réel."""

    def __init__(self):
        # session_id -> {role: WebSocket}
        self.sessions: Dict[int, Dict[str, WebSocket]] = {}

    async def connect(self, session_id: int, role: str, ws: WebSocket):
        await ws.accept()
        self.sessions.setdefault(session_id, {})[role] = ws

    def disconnect(self, session_id: int, role: str):
        if session_id in self.sessions:
            self.sessions[session_id].pop(role, None)
            if not self.sessions[session_id]:
                del self.sessions[session_id]

    async def broadcast_position(self, session_id: int, data: dict):
        """Diffuse la position GPS à tous les participants d'une session."""
        if session_id in self.sessions:
            dead = []
            for role, ws in self.sessions[session_id].items():
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(role)
            for role in dead:
                self.sessions[session_id].pop(role, None)


chat_manager = ChatManager()
delivery_manager = DeliveryManager()


# ─── JWT helper ───────────────────────────────────────────────────────────────

def decode_token_user_id(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Token WebSocket invalide")


# ─── Chat WebSocket ───────────────────────────────────────────────────────────

@router.websocket("/chat/{user_id}")
async def chat_ws(
    user_id: int,
    ws: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    WebSocket de chat.
    Le client envoie : {"receiver_id": 2, "content": "Salut!", "listing_id": null}
    Le serveur diffuse au destinataire : {"type":"message", "data": {...}}
    """
    # Verify token matches user_id
    token_user_id = decode_token_user_id(token)
    if token_user_id != user_id:
        await ws.close(code=1008)
        return

    await chat_manager.connect(user_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "detail": "JSON invalide"})
                continue

            receiver_id = payload.get("receiver_id")
            content = payload.get("content", "").strip()
            listing_id = payload.get("listing_id")
            message_type = payload.get("message_type", "text")

            if not receiver_id or not content:
                await ws.send_json({"type": "error", "detail": "receiver_id et content requis"})
                continue

            # Persist message in DB
            message = models.Message(
                sender_id=user_id,
                receiver_id=receiver_id,
                content=content,
                listing_id=listing_id,
                message_type=message_type,
            )
            db.add(message)
            db.commit()
            db.refresh(message)

            msg_data = {
                "type": "message",
                "data": {
                    "id": message.id,
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "content": content,
                    "listing_id": listing_id,
                    "message_type": message_type,
                    "is_read": False,
                    "created_at": message.created_at.isoformat(),
                },
            }

            # Send to receiver (if online)
            await chat_manager.send_to_user(receiver_id, msg_data)
            # Confirm to sender
            await ws.send_json({**msg_data, "type": "message_sent"})

    except WebSocketDisconnect:
        chat_manager.disconnect(user_id, ws)


# ─── Delivery / GPS WebSocket ─────────────────────────────────────────────────

@router.websocket("/delivery/{session_id}")
async def delivery_ws(
    session_id: int,
    ws: WebSocket,
    token: str = Query(...),
    role: str = Query("client"),  # "driver" | "client"
    db: Session = Depends(get_db),
):
    """
    WebSocket de suivi de livraison.
    Le livreur envoie : {"latitude": -3.38, "longitude": 29.36}
    Le client reçoit la position en temps réel.
    """
    user_id = decode_token_user_id(token)

    # Verify session exists
    session = db.query(models.DeliverySession).filter(models.DeliverySession.id == session_id).first()
    if not session:
        await ws.close(code=1008)
        return

    await delivery_manager.connect(session_id, f"{role}_{user_id}", ws)
    try:
        while True:
            raw = await ws.receive_text()

            if role == "driver":
                try:
                    data = json.loads(raw)
                    lat = float(data["latitude"])
                    lng = float(data["longitude"])
                except (json.JSONDecodeError, KeyError, ValueError):
                    await ws.send_json({"type": "error", "detail": "latitude et longitude requis"})
                    continue

                # Update position in DB
                session.driver_lat = lat
                session.driver_lng = lng
                session.status = "in_progress"
                db.commit()

                # Broadcast to all participants
                await delivery_manager.broadcast_position(session_id, {
                    "type": "position",
                    "session_id": session_id,
                    "latitude": lat,
                    "longitude": lng,
                    "timestamp": datetime.utcnow().isoformat(),
                })

    except WebSocketDisconnect:
        delivery_manager.disconnect(session_id, f"{role}_{user_id}")
