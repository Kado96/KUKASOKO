from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from app.database import get_db, settings
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


def save_upload(file: UploadFile) -> str:
    """Save an uploaded file and return its public path."""
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(settings.upload_dir, "listings", filename)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/listings/{filename}"


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
    """Publier une nouvelle annonce."""
    listing = models.Listing(**listing_data.model_dump(), seller_id=current_user.id)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/{listing_id}/images")
def upload_listing_images(
    listing_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Téléverser des images pour une annonce."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou accès refusé")

    paths = [save_upload(f) for f in files]
    existing = listing.image_urls.split(",") if listing.image_urls else []
    listing.image_urls = ",".join(filter(None, existing + paths))
    db.commit()
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
