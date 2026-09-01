"""
API Médiathèque KUKASOKO
- Upload de fichiers vers backend/media/
- Liste, suppression, copie d'URL
- Modèle MediaFile en DB prêt pour migration Supabase/S3
"""

import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter()

# Dossier de stockage local (servi via /media/...)
MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

# Types MIME autorisés
ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif",
    "image/webp", "image/svg+xml",
    "video/mp4", "video/webm",
    "application/pdf"
}

MAX_SIZE_MB = 20


class MediaFileOut(BaseModel):
    id: int
    filename: str
    url: str
    file_path: str
    mime_type: str
    size_bytes: int
    storage_provider: str
    media_category: str
    related_listing_id: Optional[int] = None
    related_user_id: Optional[int] = None
    uploaded_by: Optional[int] = None
    created_at: str

    class Config:
        from_attributes = True


def _build_url(request_base: str, file_path: str) -> str:
    """Construit l'URL publique d'un fichier local."""
    # file_path = "media/annonces/abc.jpg" -> URL = "http://host/media/annonces/abc.jpg"
    return f"{request_base}/{file_path}"


# OAuth2 standard optionnel pour le téléversement (invités)
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.database import settings

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub: str = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user and user.is_active:
            return user
    except (JWTError, ValueError):
        pass
    return None

@router.post("/upload", response_model=MediaFileOut)
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    category: str = Query("library", description="listing | merchant | avatar | banner | library"),
    listing_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Upload un fichier vers le dossier media/ et l'enregistre en DB (accessible aux invités)."""
    # Vérification du type MIME
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Type de fichier non autorisé: {content_type}. Utilisez JPG, PNG, GIF, WebP, MP4 ou PDF."
        )

    # Lecture du contenu
    content = await file.read()
    size = len(content)

    # Vérification de la taille
    if size > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux. Maximum autorisé: {MAX_SIZE_MB} Mo"
        )

    # Génération d'un nom unique pour éviter les collisions
    ext = os.path.splitext(file.filename or "file")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # Sous-dossier par catégorie
    sub_dir = os.path.join(MEDIA_DIR, category)
    os.makedirs(sub_dir, exist_ok=True)

    # Chemin physique final
    abs_path = os.path.join(sub_dir, unique_name)
    with open(abs_path, "wb") as f:
        f.write(content)

    # Chemin relatif pour l'URL (ex: media/listing/abc.jpg)
    rel_path = f"media/{category}/{unique_name}"

    # URL publique — construite depuis la requête pour éviter le CORB cross-origin
    base_url = str(request.base_url).rstrip("/")
    public_url = f"{base_url}/{rel_path}"

    # Enregistrement en base de données
    media_record = models.MediaFile(
        filename=file.filename or unique_name,
        file_path=rel_path,
        url=public_url,
        mime_type=content_type,
        size_bytes=size,
        storage_provider="local",
        media_category=category,
        related_listing_id=listing_id,
        uploaded_by=current_user.id if current_user else None,
    )
    db.add(media_record)
    db.commit()
    db.refresh(media_record)

    return MediaFileOut(
        id=media_record.id,
        filename=media_record.filename,
        url=media_record.url,
        file_path=media_record.file_path,
        mime_type=media_record.mime_type,
        size_bytes=media_record.size_bytes,
        storage_provider=media_record.storage_provider,
        media_category=media_record.media_category,
        related_listing_id=media_record.related_listing_id,
        related_user_id=media_record.related_user_id,
        uploaded_by=media_record.uploaded_by,
        created_at=str(media_record.created_at),
    )


@router.get("/", response_model=List[MediaFileOut])
def list_media(
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Liste tous les médias de la médiathèque (admin uniquement)."""
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    query = db.query(models.MediaFile)
    if category:
        query = query.filter(models.MediaFile.media_category == category)

    files = query.order_by(models.MediaFile.created_at.desc()).offset(skip).limit(limit).all()

    return [
        MediaFileOut(
            id=f.id,
            filename=f.filename,
            url=f.url,
            file_path=f.file_path,
            mime_type=f.mime_type,
            size_bytes=f.size_bytes,
            storage_provider=f.storage_provider,
            media_category=f.media_category,
            related_listing_id=f.related_listing_id,
            related_user_id=f.related_user_id,
            uploaded_by=f.uploaded_by,
            created_at=str(f.created_at),
        )
        for f in files
    ]


@router.delete("/{media_id}")
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprime un fichier media (du disque + de la DB)."""
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    media = db.query(models.MediaFile).filter(models.MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    # Suppression physique si stockage local
    if media.storage_provider == "local":
        abs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), media.file_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)

    db.delete(media)
    db.commit()
    return {"message": f"Fichier '{media.filename}' supprimé avec succès"}


@router.get("/stats")
def media_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Statistiques de la médiathèque pour le dashboard admin."""
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    total = db.query(models.MediaFile).count()
    total_size = db.query(models.MediaFile).with_entities(
        models.MediaFile.size_bytes
    ).all()
    size_bytes = sum(r[0] or 0 for r in total_size)

    by_category = {}
    cats = db.query(
        models.MediaFile.media_category,
        models.MediaFile.id
    ).all()
    for cat, _ in cats:
        by_category[cat] = by_category.get(cat, 0) + 1

    by_provider = {}
    providers = db.query(
        models.MediaFile.storage_provider,
        models.MediaFile.id
    ).all()
    for prov, _ in providers:
        by_provider[prov] = by_provider.get(prov, 0) + 1

    return {
        "total_files": total,
        "total_size_bytes": size_bytes,
        "total_size_mb": round(size_bytes / (1024 * 1024), 2),
        "by_category": by_category,
        "by_provider": by_provider,
        "media_dir": MEDIA_DIR,
    }
