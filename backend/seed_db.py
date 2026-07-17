import sys
import os
from sqlalchemy.orm import Session

# Add current path to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, engine
from app import models

def seed():
    print("Starting database seeding...")
    db = SessionLocal()
    try:
        # 1. Clear existing listings and categories to clean start
        print("Clearing old listings and categories...")
        db.query(models.Listing).delete()
        db.query(models.Category).delete()
        db.query(models.User).filter(models.User.email == "vendeur@isoko.com").delete()
        db.commit()

        # 2. Create a default merchant user
        print("Creating default seller user...")
        # Password is "password" hashed or simply raw if no hashing validation at DB level
        # For simplicity, we create a hashed password value similar to others
        hashed_password = "$pbkdf2-sha256$29000$hQxG11M0/V.H.x8t9Kk/Wg$bsp7R0hUj/1jS9oO1w6uS97k10B0v4W4" # dummy hash
        seller = models.User(
            email="vendeur@isoko.com",
            username="vendeur",
            hashed_password=hashed_password,
            full_name="Jean Vendeur",
            role=models.UserRole.merchant,
            is_active=True
        )
        db.add(seller)
        db.commit()
        db.refresh(seller)

        # 3. Create Categories
        print("Creating categories...")
        cat_immo = models.Category(id=1, name="Immobilier", name_fr="Immobilier", icon="🏢", color="accent")
        cat_vendre = models.Category(id=2, name="À vendre", name_fr="À vendre", icon="🛍️", color="blue")
        cat_services = models.Category(id=3, name="Services", name_fr="Services", icon="🛠️", color="green")
        db.add_all([cat_immo, cat_vendre, cat_services])
        db.commit()

        # 4. Insert Real Listings (Bujumbura geolocated)
        print("Inserting real listings...")
        listings_data = [
            {
                "title": "Chambre rénovée et élégante",
                "description": "Chambre rénovée dans un quartier calme de Bujumbura. Proche de toutes commodités, idéale pour jeunes professionnels.",
                "price": 400.0,
                "category_id": 1,
                "latitude": -3.3822,
                "longitude": 29.3644,
                "address": "Bujumbura, Burundi",
                "image_urls": "/assets/category-immobilier.jpg"
            },
            {
                "title": "Apple MacBook Pro 15",
                "description": "MacBook Pro en excellent état de marche, idéal pour le travail graphique et de bureau. Vendu avec chargeur d'origine.",
                "price": 1200000.0,
                "category_id": 2,
                "latitude": -3.3761,
                "longitude": 29.3599,
                "address": "Centre-ville, Bujumbura",
                "image_urls": "/assets/category-avendre.jpg"
            },
            {
                "title": "Services de nettoyage domestique",
                "description": "Service professionnel de nettoyage à domicile pour maisons et bureaux. Équipe ponctuelle et de confiance.",
                "price": 50000.0,
                "category_id": 3,
                "latitude": -3.3900,
                "longitude": 29.3700,
                "address": "Quartier Rohero, Bujumbura",
                "image_urls": "/assets/category-services.jpg"
            },
            {
                "title": "Belle pièce centrale",
                "description": "Grande chambre meublée dans une colocation agréable et sécurisée au coeur de Buyenzi.",
                "price": 500.0,
                "category_id": 1,
                "latitude": -3.3850,
                "longitude": 29.3550,
                "address": "Quartier Buyenzi, Bujumbura",
                "image_urls": "/assets/category-immobilier.jpg"
            },
            {
                "title": "Services de soudage en interne",
                "description": "Travaux de soudure sur mesure pour portails, fenêtres et mobilier métallique. Déplacement rapide.",
                "price": 0.0, # sur devis
                "category_id": 3,
                "latitude": -3.3950,
                "longitude": 29.3750,
                "address": "Quartier Kinindo, Bujumbura",
                "image_urls": "/assets/category-services.jpg"
            },
            {
                "title": "Aménagement paysager et jardinage",
                "description": "Entretien complet de vos parcs et jardins. Tonte de pelouse, taille de haies et entretien général des fleurs.",
                "price": 80000.0,
                "category_id": 3,
                "latitude": -3.3780,
                "longitude": 29.3680,
                "address": "Quartier Mutanga, Bujumbura",
                "image_urls": "/assets/category-services.jpg"
            }
        ]

        for item in listings_data:
            listing = models.Listing(
                title=item["title"],
                description=item["description"],
                price=item["price"],
                currency="FBU",
                status=models.ListingStatus.active,
                latitude=item["latitude"],
                longitude=item["longitude"],
                address=item["address"],
                image_urls=item["image_urls"],
                seller_id=seller.id,
                category_id=item["category_id"]
            )
            db.add(listing)
        
        db.commit()
        print("Successfully seeded database with real geolocalized listings!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
