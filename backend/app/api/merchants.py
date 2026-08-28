from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.MerchantProfileOut])
def list_merchants(skip: int = 0, limit: int = 30, db: Session = Depends(get_db)):
    """Liste de tous les marchands."""
    return db.query(models.MerchantProfile).offset(skip).limit(limit).all()


@router.get("/me", response_model=schemas.MerchantProfileOut)
def get_my_merchant_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Récupère le profil marchand de l'utilisateur connecté."""
    profile = db.query(models.MerchantProfile).filter(
        models.MerchantProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand introuvable")
    return profile



@router.get("/{merchant_id}", response_model=schemas.MerchantProfileOut)
def get_merchant(merchant_id: int, db: Session = Depends(get_db)):
    """Page publique d'un marchand : profil + boutique."""
    merchant = db.query(models.MerchantProfile).filter(models.MerchantProfile.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Marchand introuvable")
    return merchant


@router.get("/{merchant_id}/listings", response_model=List[schemas.ListingOut])
def get_merchant_listings(merchant_id: int, db: Session = Depends(get_db)):
    """Annonces actives d'un marchand."""
    merchant = db.query(models.MerchantProfile).filter(models.MerchantProfile.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Marchand introuvable")
    return (
        db.query(models.Listing)
        .filter(
            models.Listing.seller_id == merchant.user_id,
            models.Listing.status == models.ListingStatus.active,
        )
        .order_by(models.Listing.created_at.desc())
        .all()
    )


@router.post("/", response_model=schemas.MerchantProfileOut, status_code=201)
def create_merchant_profile(
    data: schemas.MerchantProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Créer un profil marchand pour l'utilisateur connecté."""
    existing = db.query(models.MerchantProfile).filter(
        models.MerchantProfile.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profil marchand déjà existant")

    profile = models.MerchantProfile(user_id=current_user.id, **data.model_dump())
    db.add(profile)
    # Upgrade role
    current_user.role = models.UserRole.merchant
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/me", response_model=schemas.MerchantProfileOut)
def update_merchant_profile(
    data: schemas.MerchantProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mettre à jour son profil marchand (champs partiels)."""
    profile = db.query(models.MerchantProfile).filter(
        models.MerchantProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/subscription", response_model=schemas.MerchantProfileOut)
def update_subscription(
    data: schemas.MerchantProfileUpdateSubscription,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mettre à jour le pack d'abonnement actif du marchand."""
    profile = db.query(models.MerchantProfile).filter(
        models.MerchantProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand introuvable")
    
    profile.subscription_pack = data.subscription_pack
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/me", status_code=204)
def delete_merchant_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Supprimer sa boutique et repasser au rôle d'utilisateur standard."""
    profile = db.query(models.MerchantProfile).filter(
        models.MerchantProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand introuvable")

    db.delete(profile)
    # Rétablir le rôle standard
    current_user.role = models.UserRole.user
    db.commit()

