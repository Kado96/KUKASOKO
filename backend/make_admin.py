import sys
import os
from sqlalchemy.orm import Session

# Add current path to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app import models
from app.auth import hash_password

def make_superuser(email: str, username: str = None, password: str = None):
    db: Session = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            print(f"L'utilisateur avec l'email {email} existe déjà.")
            user.role = models.UserRole.admin
            db.commit()
            print(f"✓ L'utilisateur '{user.username}' a été promu au rôle d'ADMIN (Superuser) avec succès !")
            return
        
        # If user does not exist, we need username and password to create one
        if not username or not password:
            print(f"Aucun utilisateur trouvé avec l'email {email}.")
            print("Pour créer un nouvel administrateur, veuillez fournir un nom d'utilisateur et un mot de passe.")
            return
        
        # Create new admin user
        hashed = hash_password(password)
        new_admin = models.User(
            email=email,
            username=username,
            hashed_password=hashed,
            full_name=username.capitalize(),
            role=models.UserRole.admin,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"✓ Nouvel administrateur '{username}' ({email}) créé et configuré avec le rôle ADMIN !")
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de la création de l'administrateur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Configuration d'un Administrateur (Superuser) ===")
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("1. Promouvoir un utilisateur existant :")
        print("   python make_admin.py <email>")
        print("\n2. Créer un nouvel administrateur :")
        print("   python make_admin.py <email> <nom_utilisateur> <mot_de_passe>")
        sys.exit(1)
        
    email_arg = sys.argv[1]
    username_arg = sys.argv[2] if len(sys.argv) > 2 else None
    password_arg = sys.argv[3] if len(sys.argv) > 3 else None
    
    make_superuser(email_arg, username_arg, password_arg)
