from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token, create_refresh_token

router = APIRouter()


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Créer un nouveau compte utilisateur."""
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")

    user = models.User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Se connecter et obtenir les tokens JWT via email ou nom d'utilisateur."""
    # Find user by either email or username
    user = db.query(models.User).filter(
        (models.User.email == credentials.email) | (models.User.username == credentials.email)
    ).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return {"access_token": access_token, "refresh_token": refresh_token}


from pydantic import BaseModel, EmailStr as PydanticEmail

class SocialLoginRequest(BaseModel):
    email: PydanticEmail
    name: str
    provider: str  # google or facebook
    id_token: str  # Mock token string


@router.post("/social-login", response_model=schemas.Token)
def social_login(payload: SocialLoginRequest, db: Session = Depends(get_db)):
    """Simulates register/login via social account."""
    # Find existing user by email
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not user:
        # Create a new user with a random password if not exists
        import secrets
        temp_pass = secrets.token_hex(16)
        # Clean username from email
        username = payload.email.split("@")[0] + "_" + payload.provider[:3]
        
        # Check if username exists, if so append random digits
        cnt = 1
        base_username = username
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{cnt}"
            cnt += 1

        user = models.User(
            email=payload.email,
            username=username,
            hashed_password=hash_password(temp_pass),
            full_name=payload.name,
            role=models.UserRole.user,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return {"access_token": access_token, "refresh_token": refresh_token}

