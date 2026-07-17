from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.api import auth, users, listings, messages, merchants, map_routes
from app.websocket import router as ws_router

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Isoko API",
    description="API backend pour la marketplace Isoko",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(listings.router, prefix="/api/listings", tags=["Listings"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(merchants.router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(map_routes.router, prefix="/api/map", tags=["Map"])
app.include_router(ws_router, prefix="/ws", tags=["WebSockets"])


@app.get("/")
def root():
    return {"message": "Isoko API is running 🚀", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
