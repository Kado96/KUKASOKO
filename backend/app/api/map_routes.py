from fastapi import APIRouter, HTTPException
import httpx
from typing import Optional

router = APIRouter()

OSRM_BASE = "https://router.project-osrm.org/route/v1"


@router.get("/route")
async def get_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    mode: Optional[str] = "driving",  # driving | cycling | foot
):
    """
    Calcul d'itinéraire via OSRM public.
    mode: driving (voiture), cycling (vélo), foot (piéton)
    """
    profile_map = {
        "driving": "driving",
        "voiture": "driving",
        "cycling": "cycling",
        "velo": "cycling",
        "vélo": "cycling",
        "foot": "foot",
        "pieton": "foot",
        "piéton": "foot",
    }
    profile = profile_map.get(mode.lower(), "driving")

    url = (
        f"{OSRM_BASE}/{profile}/"
        f"{start_lng},{start_lat};{end_lng},{end_lat}"
        f"?overview=full&geometries=geojson&steps=true"
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erreur OSRM: {str(e)}")

    if data.get("code") != "Ok":
        raise HTTPException(status_code=404, detail="Itinéraire introuvable")

    route = data["routes"][0]
    return {
        "distance_m": route["distance"],
        "duration_s": route["duration"],
        "geometry": route["geometry"],
        "steps": route["legs"][0]["steps"],
        "mode": profile,
    }


@router.get("/geocode")
async def reverse_geocode(lat: float, lng: float):
    """Géocodage inverse via Nominatim (OpenStreetMap)."""
    url = (
        f"https://nominatim.openstreetmap.org/reverse"
        f"?lat={lat}&lon={lng}&format=json&accept-language=fr"
    )
    headers = {"User-Agent": "Isoko-App/1.0"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erreur géocodage: {str(e)}")


@router.get("/search")
async def search_place(q: str):
    """Recherche de lieu via Nominatim."""
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={q}&format=json&limit=5&accept-language=fr"
        f"&countrycodes=bi"
    )
    headers = {"User-Agent": "Isoko-App/1.0"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erreur recherche: {str(e)}")
