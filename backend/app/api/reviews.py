from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewOut(BaseModel):
    id: int
    listing_id: int
    reviewer_id: int
    reviewer_name: str
    rating: int
    comment: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    report_type: str = Field(..., pattern="^(report|claim)$")
    reason: str = Field(..., min_length=5, max_length=2000)


class ReportOut(BaseModel):
    id: int
    listing_id: int
    report_type: str
    status: str
    created_at: str

    class Config:
        from_attributes = True


# ─── Reviews ────────────────────────────────────────────────────────────────────

@router.get("/{listing_id}/reviews", response_model=List[ReviewOut])
def get_reviews(listing_id: int, db: Session = Depends(get_db)):
    """Récupérer les avis d'une annonce."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    reviews = (
        db.query(models.Review)
        .filter(models.Review.listing_id == listing_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )
    return [
        ReviewOut(
            id=r.id,
            listing_id=r.listing_id,
            reviewer_id=r.reviewer_id,
            reviewer_name=r.reviewer.username if r.reviewer else "Anonyme",
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in reviews
    ]


@router.post("/{listing_id}/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    listing_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Publier un avis sur une annonce."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    # Prevent reviewing own listing
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas noter votre propre annonce.")

    # One review per user per listing
    existing = (
        db.query(models.Review)
        .filter(models.Review.listing_id == listing_id, models.Review.reviewer_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà laissé un avis sur cette annonce.")

    review = models.Review(
        listing_id=listing_id,
        reviewer_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewOut(
        id=review.id,
        listing_id=review.listing_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=current_user.username,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at.isoformat() if review.created_at else "",
    )


# ─── Reports & Claims ───────────────────────────────────────────────────────────

@router.post("/{listing_id}/reports", response_model=ReportOut, status_code=201)
def create_report(
    listing_id: int,
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Signaler ou réclamer une annonce."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    report = models.Report(
        listing_id=listing_id,
        reporter_id=current_user.id,
        report_type=data.report_type,
        reason=data.reason,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportOut(
        id=report.id,
        listing_id=report.listing_id,
        report_type=report.report_type,
        status=report.status,
        created_at=report.created_at.isoformat() if report.created_at else "",
    )
