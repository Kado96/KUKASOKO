from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, ListingStatus


# ─── Auth ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str  # Can be email or username
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ─── User ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ─── Category ────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: int
    name: str
    name_fr: Optional[str]
    name_en: Optional[str]
    name_rn: Optional[str]
    name_sw: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class CategoryTreeOut(CategoryOut):
    children: List["CategoryTreeOut"] = []


class CategoryCreate(BaseModel):
    name: str
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_rn: Optional[str] = None
    name_sw: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    name_fr: Optional[str] = None
    name_en: Optional[str] = None
    name_rn: Optional[str] = None
    name_sw: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None


# ─── Listing ─────────────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    currency: str = "BIF"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: str = "Bujumbura"
    category_id: Optional[int] = None
    image_urls: Optional[str] = None  # Comma-separated URLs from frontend upload


class ListingGuestCreate(BaseModel):
    """Annonce publiée par un visiteur non connecté.
    Limitée à 1 annonce active par guest_token (UUID localStorage), valable 24h.
    """
    title: str
    description: Optional[str] = None
    price: float
    currency: str = "BIF"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: str = "Bujumbura"
    category_id: Optional[int] = None
    image_urls: Optional[str] = None
    # Champs obligatoires pour les invités
    guest_token: str          # UUID généré côté client et stocké en localStorage
    guest_name: str           # Nom du vendeur (affiché dans l'annonce)
    guest_phone: str          # Téléphone de contact


class ListingUpdate(BaseModel):
    """Mise à jour partielle d'une annonce (PATCH).
    Tous les champs sont optionnels.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    category_id: Optional[int] = None
    image_urls: Optional[str] = None


class ListingOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    price: float
    currency: str
    status: ListingStatus
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    city: str
    image_urls: Optional[str]
    seller_id: Optional[int] = None   # nullable pour les annonces invité
    category_id: Optional[int]
    views: int
    is_featured: bool
    expires_at: Optional[datetime] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    created_at: datetime
    seller: Optional[UserOut] = None
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True


# ─── Merchant ────────────────────────────────────────────────────────────────

class MerchantProfileCreate(BaseModel):
    shop_name: str
    shop_description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    opening_hours: Optional[str] = None
class MerchantProfileUpdateSubscription(BaseModel):
    subscription_pack: str

class MerchantProfileOut(BaseModel):
    id: int
    user_id: int
    shop_name: str
    shop_description: Optional[str]
    logo_url: Optional[str]
    banner_url: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    phone: Optional[str]
    whatsapp: Optional[str]
    opening_hours: Optional[str]
    rating: float
    review_count: int
    is_verified: bool
    subscription_pack: Optional[str] = "Standard"
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ─── Message ─────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    listing_id: Optional[int] = None
    message_type: str = "text"


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    listing_id: Optional[int]
    content: str
    message_type: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ─── Delivery ────────────────────────────────────────────────────────────────

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class DeliverySessionOut(BaseModel):
    id: int
    listing_id: Optional[int]
    driver_id: int
    client_id: int
    driver_lat: Optional[float]
    driver_lng: Optional[float]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


CategoryTreeOut.model_rebuild()
