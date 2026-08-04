from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.api import auth, users, listings, messages, merchants, map_routes, reviews, media
from app.websocket import router as ws_router
from sqlalchemy import text, inspect

# Create DB tables
Base.metadata.create_all(bind=engine)

# Ensure parent_id exists on categories (SQLite create_all won't alter existing tables)
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

app = FastAPI(
    title="Isoko API",
    description="API backend pour la marketplace Isoko",
    version="1.0.0",
)

# CORS — origines autorisées (dev + production)
# Ajouter CORS_ORIGINS dans les variables Render pour des origines supplémentaires
_extra_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Développement local
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        # Production
        "https://kukasoko.wuaze.com",
        "https://kukasoko.onrender.com",
        "https://www.kukasoko.wuaze.com",
        # Variable d'environnement (optionnelle)
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom StaticFiles to inject CORS headers at ASGI level (forces CORS everywhere)
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

# Include routers
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
    return {"message": "Isoko API is running 🚀", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
