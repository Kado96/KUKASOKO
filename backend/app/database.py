from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Local dev → SQLite  |  Production → postgresql://...
    database_url: str = "sqlite:///./isoko.db"
    secret_key: str = "supersecretkey_changeme_in_production_32chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    frontend_url: str = "http://localhost:5173"
    upload_dir: str = "media"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# ── Database URL normalization ────────────────────────────────────────────────
# Render / Railway / Heroku expose "postgres://" but SQLAlchemy requires
# "postgresql://"  →  fix it automatically.
_url = settings.database_url
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql://", 1)

# ── Engine — SQLite needs check_same_thread=False ────────────────────────────
_is_sqlite = _url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    _url,
    connect_args=_connect_args,
    # SQLite doesn't support pool settings the same way
    pool_pre_ping=not _is_sqlite,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Database dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
