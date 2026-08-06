from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import logging

from app.database import engine, Base
from app.api import auth, users, listings, messages, merchants, map_routes, reviews, media
from app.websocket import router as ws_router
from sqlalchemy import text, inspect

logger = logging.getLogger(__name__)

# ─── Auto-migrations Alembic (run once at startup, works on Render + local) ──
def _run_alembic_migrations():
    """Applique toutes les migrations Alembic en attente au démarrage."""
    try:
        import os as _os
        from alembic.config import Config
        from alembic import command

        # Résout le chemin d'alembic.ini relativement à ce fichier
        here = _os.path.dirname(_os.path.abspath(__file__))
        alembic_ini = _os.path.join(here, "alembic.ini")

        if not _os.path.exists(alembic_ini):
            logger.warning("alembic.ini not found, skipping migrations.")
            return

        alembic_cfg = Config(alembic_ini)
        alembic_cfg.set_main_option("script_location", _os.path.join(here, "alembic"))
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Alembic migrations applied successfully.")
    except Exception as e:
        logger.error(f"⚠️  Alembic migration error (non-fatal): {e}")

_run_alembic_migrations()

# ─── Create DB tables (fallback si alembic non configuré) ─────────────────────
Base.metadata.create_all(bind=engine)

# ─── Ensure parent_id exists on categories ────────────────────────────────────
def _ensure_category_parent_id():
    try:
        insp = inspect(engine)
        if "categories" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("categories")}
        if "parent_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)"))
    except Exception:
        pass

_ensure_category_parent_id()

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Kukasoko API",
    description="API backend pour la marketplace Kukasoko",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Origines autorisées (dev + production)
# Ajouter CORS_ORIGINS dans les variables Render pour des origines supplémentaires
_extra_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]

ALLOWED_ORIGINS = [
    # Développement local
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
    # Production (http + https)
    "https://kukasoko.wuaze.com",
    "http://kukasoko.wuaze.com",
    "https://www.kukasoko.wuaze.com",
    "http://www.kukasoko.wuaze.com",
    "https://kukasoko.onrender.com",
    "http://kukasoko.onrender.com",
    *_extra_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ─── Handler d'exception global avec headers CORS ────────────────────────────
# Quand FastAPI retourne une erreur 500, le middleware CORS ne peut pas
# toujours injecter les headers. Ce handler les force manuellement.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    cors_origin = origin if origin in ALLOWED_ORIGINS else ""
    headers = {}
    if cors_origin:
        headers["Access-Control-Allow-Origin"] = cors_origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur. Réessayez dans un instant."},
        headers=headers,
    )

# ─── Custom StaticFiles CORS ──────────────────────────────────────────────────
class CORSStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["method"] == "OPTIONS":
            await send({
                "type": "http.response.start",
                "status": 204,
                "headers": [
                    (b"access-control-allow-origin", b"*"),
                    (b"access-control-allow-methods", b"GET, OPTIONS"),
                    (b"access-control-allow-headers", b"*"),
                ],
            })
            await send({"type": "http.response.body", "body": b""})
            return

        async def cors_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers = [h for h in headers if h[0].lower() != b"access-control-allow-origin"]
                headers.append((b"access-control-allow-origin", b"*"))
                headers.append((b"access-control-allow-methods", b"GET, OPTIONS"))
                headers.append((b"access-control-allow-headers", b"*"))
                message["headers"] = headers
            await send(message)

        await super().__call__(scope, receive, cors_send)

os.makedirs("media", exist_ok=True)
app.mount("/media", CORSStaticFiles(directory="media"), name="media")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(listings.router, prefix="/api/listings", tags=["Listings"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(merchants.router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(map_routes.router, prefix="/api/map", tags=["Map"])
app.include_router(reviews.router, prefix="/api/listings", tags=["Reviews"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(ws_router, prefix="/ws", tags=["WebSockets"])


@app.get("/")
def root():
    return {"message": "Kukasoko API is running 🚀", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
