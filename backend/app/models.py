from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    user = "user"
    merchant = "merchant"
    admin = "admin"


class ListingStatus(str, enum.Enum):
    active = "active"
    sold = "sold"
    paused = "paused"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    avatar_url = Column(String)
    phone = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    listings = relationship("Listing", back_populates="seller")
    merchant_profile = relationship("MerchantProfile", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    reviews = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    reports = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    name_fr = Column(String)
    name_en = Column(String)
    name_rn = Column(String)  # Kirundi
    name_sw = Column(String)  # Swahili
    icon = Column(String)
    color = Column(String)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)

    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")
    listings = relationship("Listing", back_populates="category")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    currency = Column(String, default="BIF")
    status = Column(Enum(ListingStatus), default=ListingStatus.active)

    # Location
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String)
    city = Column(String, default="Bujumbura")

    # Images (comma-separated paths)
    image_urls = Column(Text)

    # seller_id est nullable : NULL pour les annonces d'invités (sans compte)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))

    # ── Annonce invité (sans compte) ─────────────────────────────────────────
    # guest_token : UUID stocké dans le localStorage du navigateur (limite 1/24h)
    guest_token = Column(String, nullable=True, index=True)
    guest_name  = Column(String, nullable=True)   # Nom affiché du vendeur invité
    guest_phone = Column(String, nullable=True)   # Téléphone de contact invité

    views = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    # Pour les annonces gratuites (clients sans boutique OU invités) : expiration 24h
    # NULL pour les marchands = annonce permanente
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    seller = relationship("User", back_populates="listings")
    category = relationship("Category", back_populates="listings")
    reviews = relationship("Review", back_populates="listing")
    reports = relationship("Report", back_populates="listing")


class MerchantProfile(Base):
    __tablename__ = "merchant_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    shop_name = Column(String, nullable=False)
    shop_description = Column(Text)
    logo_url = Column(String)
    banner_url = Column(String)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String)
    whatsapp = Column(String)
    opening_hours = Column(String)  # JSON string
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    subscription_pack = Column(String, default="Standard")  # Standard, Premium, Pro
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="merchant_profile")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, image, voice
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


class DeliverySession(Base):
    __tablename__ = "delivery_sessions"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    driver_id = Column(Integer, ForeignKey("users.id"))
    client_id = Column(Integer, ForeignKey("users.id"))
    driver_lat = Column(Float)
    driver_lng = Column(Float)
    status = Column(String, default="pending")  # pending, in_progress, delivered
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Review(Base):
    """Avis laissé sur une annonce par un utilisateur."""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    listing = relationship("Listing", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews")


class Report(Base):
    """Signalement ou réclamation sur une annonce."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String, nullable=False)  # "report" or "claim"
    reason = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending, reviewed, resolved
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    listing = relationship("Listing", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reports")


class MediaFile(Base):
    """
    Médiathèque centralisée.
    - storage_provider : 'local' | 'supabase' | 's3' | 'cloudinary'
    - Prêt pour migration vers Supabase Storage ou tout autre CDN.
    """
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)

    # Nom original du fichier
    filename = Column(String, nullable=False)

    # Chemin relatif dans le dossier media/ ou URL complète (Supabase/S3)
    file_path = Column(String, nullable=False)

    # URL publique d'accès au fichier
    url = Column(String, nullable=False)

    # Type MIME : image/jpeg, image/png, video/mp4, etc.
    mime_type = Column(String, default="image/jpeg")

    # Taille en octets
    size_bytes = Column(Integer, default=0)

    # Provider de stockage : local, supabase, s3, cloudinary
    storage_provider = Column(String, default="local")

    # Catégorie fonctionnelle : listing, merchant, avatar, banner, library
    media_category = Column(String, default="library")

    # Référence optionnelle à l'entité parente
    related_listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    related_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Qui a uploadé
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    price = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String, nullable=False, default="BIF")
    duration_days = Column(Integer, nullable=False, default=30)

    # Limites
    max_listings = Column(Integer, nullable=False, default=5)
    featured_listings = Column(Boolean, nullable=False, default=False)
    advanced_analytics = Column(Boolean, nullable=False, default=False)
    marketing_tools = Column(Boolean, nullable=False, default=False)

    # Règles de notifications
    notif_message_contact = Column(Boolean, nullable=False, default=True)
    notif_weekly_report = Column(Boolean, nullable=False, default=False)
    notif_listing_views = Column(Boolean, nullable=False, default=False)
    notif_new_review = Column(Boolean, nullable=False, default=False)
    notif_daily_ai_report = Column(Boolean, nullable=False, default=False)
    notif_anomaly_alert = Column(Boolean, nullable=False, default=False)
    notif_ai_recommendations = Column(Boolean, nullable=False, default=False)

    # Canaux
    email_notifications = Column(Boolean, nullable=False, default=False)
    whatsapp_notifications = Column(Boolean, nullable=False, default=False)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)

    status = Column(String, nullable=False, default="active")  # active, expired, cancelled, pending
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, nullable=False, default=False)

    # Préférences de notification de l'abonné
    whatsapp_number = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    plan = relationship("SubscriptionPlan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, nullable=False, default="BIF")
    provider = Column(String, nullable=False, default="pending")  # pending, afri_pay, paypal, manual
    transaction_id = Column(String, unique=True, nullable=True, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, success, failed, cancelled, refunded
    payment_method = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime, nullable=True)

    user = relationship("User")
    subscription = relationship("Subscription")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # message_contact, weekly_report, listing_views, new_review, daily_ai_report, anomaly_alert, ai_recommendations
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String, nullable=False)  # daily_summary, market_insights
    content_json = Column(Text, nullable=False)  # Contenu structuré
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_to_count = Column(Integer, default=0)

