from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.get("/conversations", response_model=List[schemas.MessageOut])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retourne le dernier message de chaque conversation."""
    subquery = (
        db.query(
            models.Message.sender_id,
            models.Message.receiver_id,
        )
        .filter(
            or_(
                models.Message.sender_id == current_user.id,
                models.Message.receiver_id == current_user.id,
            )
        )
        .subquery()
    )
    messages = (
        db.query(models.Message)
        .filter(
            or_(
                models.Message.sender_id == current_user.id,
                models.Message.receiver_id == current_user.id,
            )
        )
        .order_by(models.Message.created_at.desc())
        .all()
    )
    # De-duplicate by conversation partner
    seen = set()
    conversations = []
    for msg in messages:
        partner_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if partner_id not in seen:
            seen.add(partner_id)
            conversations.append(msg)
    return conversations


@router.get("/{partner_id}", response_model=List[schemas.MessageOut])
def get_thread(
    partner_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retourne tous les messages entre l'utilisateur et un autre."""
    messages = (
        db.query(models.Message)
        .filter(
            or_(
                and_(
                    models.Message.sender_id == current_user.id,
                    models.Message.receiver_id == partner_id,
                ),
                and_(
                    models.Message.sender_id == partner_id,
                    models.Message.receiver_id == current_user.id,
                ),
            )
        )
        .order_by(models.Message.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Mark received messages as read
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
    db.commit()
    return messages


@router.post("/", response_model=schemas.MessageOut, status_code=201)
def send_message(
    msg_data: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Envoyer un message HTTP (fallback si WebSocket indisponible)."""
    receiver = db.query(models.User).filter(models.User.id == msg_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Destinataire introuvable")

    message = models.Message(
        sender_id=current_user.id,
        **msg_data.model_dump(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
