"""
Script de migration des images vers Supabase Storage.
- Recupere toutes les annonces via l'API REST Supabase
- Uploade les images locales vers le bucket Supabase 'media'
- Met a jour les URLs dans la base de donnees Supabase
"""

import os
import glob
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://myceoydtlctqampztttt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "media"

if not SUPABASE_KEY:
    print("ERREUR: SUPABASE_SERVICE_KEY manquante dans .env")
    exit(1)

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}


def upload_file_to_supabase(local_path: str, supabase_path: str) -> str:
    """Uploade un fichier local vers Supabase Storage et retourne l'URL publique."""
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{supabase_path}"
    
    ext = os.path.splitext(local_path)[1].lower()
    mime = "image/jpeg"
    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".gif":
        mime = "image/gif"

    with open(local_path, "rb") as f:
        content = f.read()

    resp = requests.post(
        upload_url,
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": mime,
            "x-upsert": "true",
        },
        data=content,
    )
    if resp.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{supabase_path}"
        print(f"  OK: {os.path.basename(local_path)} -> {public_url}")
        return public_url
    else:
        print(f"  ECHEC upload {local_path}: {resp.status_code} {resp.text[:200]}")
        return ""


def get_all_listings():
    """Recupere toutes les annonces depuis Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/listings?select=id,image_urls"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        return resp.json()
    else:
        print(f"ERREUR lors de la recuperation des annonces: {resp.status_code} {resp.text[:300]}")
        return []


def update_listing_image(listing_id: int, image_urls: str):
    """Met a jour les URLs d'images d'une annonce via l'API REST Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
    
    resp = requests.patch(
        url,
        headers=HEADERS,
        json={"image_urls": image_urls},
    )
    if resp.status_code in (200, 204):
        print(f"  DB mise a jour: annonce #{listing_id}")
    else:
        print(f"  ECHEC mise a jour annonce #{listing_id}: {resp.status_code} {resp.text[:200]}")


# ─── ETAPE 1: Uploader les images locales de fallback (categories) ────────────
print("\n=== ETAPE 1: Upload des images de categories ===")

category_images = {
    "category-avendre.jpg": "public/category-avendre.jpg",
    "category-immobilier.jpg": "public/category-immobilier.jpg",
    "category-services.jpg": "public/category-services.jpg",
}

for filename, local_rel_path in category_images.items():
    # Chercher dans plusieurs emplacements possibles
    possible_paths = [
        os.path.join("..", "frontend", "public", filename),
        os.path.join("media", "listing", filename),
        local_rel_path,
    ]
    found = next((p for p in possible_paths if os.path.exists(p)), None)
    if found:
        upload_file_to_supabase(found, f"listing/{filename}")
    else:
        print(f"  Non trouve: {filename}")


# ─── ETAPE 2: Uploader toutes les images locales de media/listing/ ────────────
print("\n=== ETAPE 2: Upload des images locales de media/listing/ ===")

local_listing_dir = os.path.join("media", "listing")
if os.path.exists(local_listing_dir):
    local_files = glob.glob(os.path.join(local_listing_dir, "*.*"))
    print(f"{len(local_files)} images trouvees dans media/listing/")
    
    # Map: nom de fichier -> URL Supabase publique
    filename_to_supabase_url = {}
    for local_path in local_files:
        filename = os.path.basename(local_path)
        supabase_path = f"listing/{filename}"
        public_url = upload_file_to_supabase(local_path, supabase_path)
        if public_url:
            filename_to_supabase_url[filename] = public_url
            # Aussi mapper le chemin relatif complet
            filename_to_supabase_url[f"media/listing/{filename}"] = public_url
else:
    print("  Dossier media/listing/ non trouve - passage a l'etape suivante")
    filename_to_supabase_url = {}


# ─── ETAPE 3: Mettre a jour les annonces en base de donnees ───────────────────
print("\n=== ETAPE 3: Mise a jour des URLs dans la base de donnees ===")

listings = get_all_listings()
print(f"{len(listings)} annonces trouvees en base")

updated = 0
for listing in listings:
    lid = listing.get("id")
    current_image_urls = listing.get("image_urls", "") or ""

    # Verifier si l'URL est deja une URL Supabase ou externe valide
    def needs_update(url: str) -> bool:
        if not url:
            return False
        return not url.startswith("http") or "localhost" in url or "onrender.com" in url

    if not needs_update(current_image_urls):
        continue

    # Construire la nouvelle liste d'URLs Supabase
    new_urls = []
    for url_part in current_image_urls.split(","):
        url_part = url_part.strip()
        if not url_part:
            continue
        
        # Si deja une URL externe valide (pas localhost/onrender)
        if url_part.startswith("http") and "localhost" not in url_part and "onrender.com" not in url_part:
            new_urls.append(url_part)
            continue
        
        # Extraire le nom du fichier
        basename = os.path.basename(url_part.replace("\\", "/"))
        
        # Chercher dans le mapping
        if basename in filename_to_supabase_url:
            new_urls.append(filename_to_supabase_url[basename])
        elif url_part in filename_to_supabase_url:
            new_urls.append(filename_to_supabase_url[url_part])
        else:
            print(f"  ATTENTION: image introuvable localement: {url_part}")
            new_urls.append(url_part)

    if new_urls:
        new_image_urls = ",".join(new_urls)
        update_listing_image(lid, new_image_urls)
        updated += 1

print(f"\n=== TERMINE: {updated} annonces mises a jour ===")
