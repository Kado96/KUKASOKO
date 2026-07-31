from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from app.database import get_db, settings
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


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
        query = query.filter(models.Listing.category_id == category_id)
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
        query = query.filter(models.Listing.category_id == category_id)
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


@router.post("/", response_model=schemas.ListingOut, status_code=201)
def create_listing(
    listing_data: schemas.ListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Publier une nouvelle annonce.
    
    Règle métier :
    - Client simple (role=user) : 1 annonce maximum.
    - Marchand / Admin : annonces illimitées.
    """
    # ── Règle : client simple limité à 1 annonce ─────────────────────────────
    if current_user.role == models.UserRole.user:
        existing_count = (
            db.query(models.Listing)
            .filter(
                models.Listing.seller_id == current_user.id,
                models.Listing.status != models.ListingStatus.sold,
            )
            .count()
        )
        if existing_count >= 1:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Les clients sans boutique ne peuvent publier qu'une seule annonce active. "
                    "Créez votre boutique pour publier plusieurs annonces."
                ),
            )

    listing = models.Listing(**listing_data.model_dump(), seller_id=current_user.id)
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


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer une annonce."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou accès refusé")
    db.delete(listing)
    db.commit()


@router.get("/categories/all", response_model=List[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    """Toutes les catégories disponibles."""
    return db.query(models.Category).all()
