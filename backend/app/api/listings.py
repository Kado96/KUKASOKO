from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from datetime import datetime, timedelta, timezone
from app.database import get_db, settings
from app import models, schemas
from app.auth import get_current_user, get_current_admin

router = APIRouter()


def _category_filter_ids(db: Session, category_id: int) -> List[int]:
    """Inclut la catégorie et ses sous-catégories pour le filtrage d'annonces."""
    ids = [category_id]
    children = (
        db.query(models.Category.id)
        .filter(models.Category.parent_id == category_id)
        .all()
    )
    ids.extend(c.id for c in children)
    return ids


import httpx

# Supabase Storage configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://myceoydtlctqampztttt.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = "media"


async def upload_to_supabase(file: UploadFile, category: str = "listing") -> str:
    """Upload a file to Supabase Storage and return its public URL."""
    ext = os.path.splitext(file.filename or "file")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    supabase_path = f"{category}/{filename}"

    content = await file.read()
    content_type = file.content_type or "image/jpeg"

    # If no Supabase key configured, fallback to local save
    if not SUPABASE_SERVICE_KEY:
        dest = os.path.join("media", category, filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(content)
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        return f"{backend_url}/media/{category}/{filename}"

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{supabase_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(upload_url, content=content, headers=headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Image upload failed: {resp.text}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{supabase_path}"
    return public_url



@router.get("/", response_model=List[schemas.ListingOut])
def get_listings(
    category_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Récupérer les annonces avec filtres optionnels."""
    query = db.query(models.Listing).filter(models.Listing.status == models.ListingStatus.active)
    if category_id:
        query = query.filter(
            models.Listing.category_id.in_(_category_filter_ids(db, category_id))
        )
    if city:
        query = query.filter(models.Listing.city.ilike(f"%{city}%"))
    if min_price is not None:
        query = query.filter(models.Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Listing.price <= max_price)
    if search:
        query = query.filter(
            models.Listing.title.ilike(f"%{search}%") |
            models.Listing.description.ilike(f"%{search}%")
        )
    return query.order_by(models.Listing.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/map", response_model=List[schemas.ListingOut])
def get_listings_for_map(
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Annonces géolocalisées pour la carte, avec filtre catégorie."""
    query = (
        db.query(models.Listing)
        .filter(
            models.Listing.status == models.ListingStatus.active,
            models.Listing.latitude.isnot(None),
            models.Listing.longitude.isnot(None),
        )
    )
    if category_id:
        query = query.filter(
            models.Listing.category_id.in_(_category_filter_ids(db, category_id))
        )
    return query.all()


@router.get("/{listing_id}", response_model=schemas.ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    """Détail d'une annonce. Incrémente le compteur de vues."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    listing.views += 1
    db.commit()
    db.refresh(listing)
    return listing



# ─── Annonce invité (sans compte) ────────────────────────────────────────────

@router.post("/guest", response_model=schemas.ListingOut, status_code=201)
def create_guest_listing(
    listing_data: schemas.ListingGuestCreate,
    db: Session = Depends(get_db),
):
    """Publier une annonce gratuite SANS être connecté.

    Règles :
    - 1 annonce active par guest_token (UUID généré côté client, stocké en localStorage).
    - Annonce valable 24h puis archivée automatiquement.
    - Le guest_token, guest_name et guest_phone sont stockés pour identifier le vendeur.
    """
    now = datetime.now(timezone.utc)

    # Valider le guest_token (doit être un UUID v4 valide pour éviter les abus)
    import re
    uuid_pattern = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )
    if not uuid_pattern.match(listing_data.guest_token):
        raise HTTPException(status_code=400, detail="guest_token invalide (UUID v4 requis).")

    # Chercher les annonces actives de cet invité
    active_listings = (
        db.query(models.Listing)
        .filter(
            models.Listing.guest_token == listing_data.guest_token,
            models.Listing.status == models.ListingStatus.active,
        )
        .all()
    )

    # Archiver automatiquement les annonces expirées
    still_active = []
    for l in active_listings:
        # l.expires_at provenant de SQLite est offset-naive. Rendons-le offset-aware ou comparons-les en naive UTC.
        exp = l.expires_at
        if exp:
            if exp.tzinfo is not None:
                exp = exp.astimezone(timezone.utc).replace(tzinfo=None)
            naive_now = now.replace(tzinfo=None)
            if exp < naive_now:
                l.status = models.ListingStatus.sold
            else:
                still_active.append(l)
        else:
            still_active.append(l)
    if active_listings:
        db.commit()

    # Bloquer si une annonce active existe encore
    if still_active:
        naive_exp = still_active[0].expires_at
        if naive_exp and naive_exp.tzinfo is not None:
            naive_exp = naive_exp.astimezone(timezone.utc).replace(tzinfo=None)
        
        naive_now = now.replace(tzinfo=None)
        remaining = naive_exp - naive_now if naive_exp else None
        hours_left = int(remaining.total_seconds() // 3600) if remaining else 0
        minutes_left = int((remaining.total_seconds() % 3600) // 60) if remaining else 0
        raise HTTPException(
            status_code=403,
            detail=(
                f"Vous avez déjà une annonce gratuite active (expire dans {hours_left}h{minutes_left:02d}min). "
                "Créez un compte pour accéder à votre boutique et publier plusieurs annonces illimitées."
            ),
        )

    # Créer l'annonce invité avec expiration 24h
    expires_at = now + timedelta(hours=24)
    data = listing_data.model_dump(exclude={"guest_token", "guest_name", "guest_phone"})
    listing = models.Listing(
        **data,
        seller_id=None,
        guest_token=listing_data.guest_token,
        guest_name=listing_data.guest_name,
        guest_phone=listing_data.guest_phone,
        expires_at=expires_at,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/", response_model=schemas.ListingOut, status_code=201)
def create_listing(
    listing_data: schemas.ListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Publier une nouvelle annonce.
    
    Règle métier :
    - Client simple (role=user) : 1 annonce gratuite valable 24h.
      Si l'annonce précédente a expiré, elle est archivée et il peut en poster une nouvelle.
    - Marchand / Admin : annonces illimitées, sans expiration.
    """
    now = datetime.now(timezone.utc)

    if current_user.role == models.UserRole.user:
        # Chercher les annonces actives non expirées de l'utilisateur
        active_listings = (
            db.query(models.Listing)
            .filter(
                models.Listing.seller_id == current_user.id,
                models.Listing.status == models.ListingStatus.active,
            )
            .all()
        )

        # Archiver automatiquement les annonces expirées (expires_at < now)
        still_active = []
        for l in active_listings:
            if l.expires_at and l.expires_at < now:
                l.status = models.ListingStatus.sold  # archiver silencieusement
            else:
                still_active.append(l)
        if active_listings:
            db.commit()

        # Bloquer si l'utilisateur a encore une annonce active non expirée
        if still_active:
            # Calculer le temps restant
            remaining = still_active[0].expires_at - now if still_active[0].expires_at else None
            hours_left = int(remaining.total_seconds() // 3600) if remaining else 0
            minutes_left = int((remaining.total_seconds() % 3600) // 60) if remaining else 0
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Vous avez déjà une annonce gratuite active (expire dans {hours_left}h{minutes_left:02d}min). "
                    "Créez votre boutique pour publier plusieurs annonces illimitées."
                ),
            )

        # OK : créer l'annonce gratuite avec expiration 24h
        expires_at = now + timedelta(hours=24)
        listing = models.Listing(
            **listing_data.model_dump(),
            seller_id=current_user.id,
            expires_at=expires_at,
        )
    else:
        # Marchand / Admin : pas d'expiration
        listing = models.Listing(
            **listing_data.model_dump(),
            seller_id=current_user.id,
        )

    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/{listing_id}/images")
async def upload_listing_images(
    listing_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Téléverser des images pour une annonce et les cataloguer dans la médiathèque centralisée."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou accès refusé")

    paths = []
    for file in files:
        public_url = await upload_to_supabase(file, "listing")
        paths.append(public_url)

        # Enregistrement dans la médiathèque
        media_record = models.MediaFile(
            filename=file.filename or "listing_image",
            file_path=public_url,
            url=public_url,
            mime_type=file.content_type or "image/jpeg",
            storage_provider="supabase",
            media_category="listing",
            related_listing_id=listing_id,
            uploaded_by=current_user.id,
        )
        db.add(media_record)

    existing = listing.image_urls.split(",") if listing.image_urls else []
    listing.image_urls = ",".join(filter(None, existing + paths))
    db.commit()
    db.refresh(listing)
    return {"image_urls": paths}


@router.patch("/{listing_id}", response_model=schemas.ListingOut)
def update_listing(
    listing_id: int,
    data: schemas.ListingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Modifier une annonce.

    Règles :
    - Marchand / Admin : modification illimitée dans le temps.
    - Client simple (role=user) : modification autorisée dans la 1ère heure
      suivant la création de l'annonce seulement.
    """
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou accès refusé")

    # Règle temporelle pour les clients sans boutique
    if current_user.role == models.UserRole.user:
        now = datetime.now(timezone.utc)
        # created_at peut être naive ou aware selon le driver
        created = listing.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = now - created
        if elapsed.total_seconds() > 3600:  # 1 heure = 3600 secondes
            raise HTTPException(
                status_code=403,
                detail=(
                    "La modification n'est possible que dans la première heure suivant la publication. "
                    "Créez une boutique pour des modifications illimitées."
                ),
            )

    # Appliquer les modifications (champs non-None uniquement)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(listing, field, value)
    db.commit()
    db.refresh(listing)
    return listing


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer une annonce.

    Règles :
    - Marchand / Admin : suppression illimitée.
    - Client simple : peut supprimer son annonce gratuite pendant les 24h
      (tant que expires_at n'est pas dépassé ou si expires_at est NULL).
    """
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou accès refusé")

    # Vérification pour clients sans boutique : suppression ok pendant 24h
    if current_user.role == models.UserRole.user and listing.expires_at:
        now = datetime.now(timezone.utc)
        expires = listing.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            raise HTTPException(
                status_code=403,
                detail="Votre annonce gratuite de 24h a expiré. Elle a été archivée automatiquement.",
            )

    db.delete(listing)
    db.commit()


@router.get("/categories/all", response_model=List[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    """Toutes les catégories disponibles (liste plate)."""
    return db.query(models.Category).order_by(models.Category.name).all()


@router.get("/categories/tree", response_model=List[schemas.CategoryTreeOut])
def get_categories_tree(db: Session = Depends(get_db)):
    """Arborescence catégories → sous-catégories."""
    parents = (
        db.query(models.Category)
        .filter(models.Category.parent_id.is_(None))
        .order_by(models.Category.name)
        .all()
    )
    result: List[schemas.CategoryTreeOut] = []
    for p in parents:
        children = sorted(p.children or [], key=lambda c: c.name or "")
        result.append(
            schemas.CategoryTreeOut(
                id=p.id,
                name=p.name,
                name_fr=p.name_fr,
                name_en=p.name_en,
                name_rn=p.name_rn,
                name_sw=p.name_sw,
                icon=p.icon,
                color=p.color,
                parent_id=p.parent_id,
                children=[
                    schemas.CategoryTreeOut(
                        id=c.id,
                        name=c.name,
                        name_fr=c.name_fr,
                        name_en=c.name_en,
                        name_rn=c.name_rn,
                        name_sw=c.name_sw,
                        icon=c.icon,
                        color=c.color,
                        parent_id=c.parent_id,
                        children=[],
                    )
                    for c in children
                ],
            )
        )
    return result


@router.post("/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    data: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """(Admin) Créer une catégorie ou sous-catégorie."""
    if data.parent_id is not None:
        parent = db.query(models.Category).filter(models.Category.id == data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Catégorie parente introuvable")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Une sous-catégorie ne peut pas avoir d'enfants")

    existing = db.query(models.Category).filter(models.Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Une catégorie avec ce nom existe déjà")

    cat = models.Category(
        name=data.name,
        name_fr=data.name_fr or data.name,
        name_en=data.name_en,
        name_rn=data.name_rn,
        name_sw=data.name_sw,
        icon=data.icon,
        color=data.color,
        parent_id=data.parent_id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: int,
    data: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """(Admin) Modifier une catégorie."""
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    payload = data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"]:
        clash = (
            db.query(models.Category)
            .filter(models.Category.name == payload["name"], models.Category.id != category_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="Une catégorie avec ce nom existe déjà")

    if "parent_id" in payload and payload["parent_id"] is not None:
        if payload["parent_id"] == category_id:
            raise HTTPException(status_code=400, detail="Une catégorie ne peut pas être son propre parent")
        parent = db.query(models.Category).filter(models.Category.id == payload["parent_id"]).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Catégorie parente introuvable")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Une sous-catégorie ne peut pas avoir d'enfants")
        if cat.children:
            raise HTTPException(status_code=400, detail="Impossible de déplacer une catégorie qui a des sous-catégories")

    for key, value in payload.items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """(Admin) Supprimer une catégorie (et ses sous-catégories)."""
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    ids = [cat.id] + [c.id for c in (cat.children or [])]
    used = (
        db.query(models.Listing)
        .filter(models.Listing.category_id.in_(ids))
        .first()
    )
    if used:
        raise HTTPException(
            status_code=400,
            detail="Des annonces utilisent cette catégorie. Réassignez-les avant de supprimer.",
        )

    for child in list(cat.children or []):
        db.delete(child)
    db.delete(cat)
    db.commit()
    return None
