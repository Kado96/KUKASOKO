import os
import glob
import psycopg2
import requests
from dotenv import load_dotenv

# Charger les variables
load_dotenv()

# Configuration Supabase déduite
PROJECT_REF = "myceoydtlctqampztttt"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"
DATABASE_URL = os.getenv("DATABASE_URL")

# Demander la clé API si non configurée
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_KEY:
    print("Cle API Supabase manquante dans le fichier .env.")
    SUPABASE_KEY = input("Entrez votre cle API Supabase : ").strip()

if not DATABASE_URL or "VOTRE_MOT_DE_PASSE" in DATABASE_URL:
    print("DATABASE_URL manquante dans le fichier .env")
    exit(1)

# Dossier local des images d'annonces
LOCAL_MEDIA_DIR = os.path.join("media", "listing")

if not os.path.exists(LOCAL_MEDIA_DIR):
    print(f"Le dossier local {LOCAL_MEDIA_DIR} n'existe pas. Assurez-vous d'etre dans le dossier backend/.")
    exit(1)

# Trouver tous les fichiers images locaux
local_files = glob.glob(os.path.join(LOCAL_MEDIA_DIR, "*.*"))
if not local_files:
    print("Aucune image trouvee dans media/listing/")
    exit(0)

print(f"{len(local_files)} images localisees pour l'upload.")

# Connexion à la DB Supabase de production
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
except Exception as e:
    print(f"Erreur connexion PostgreSQL : {e}")
    exit(1)

headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY
}

# Uploader et mettre à jour
for file_path in local_files:
    filename = os.path.basename(file_path)
    supabase_path = f"listing/{filename}"
    
    # 1. Uploader vers le bucket Supabase "media"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/media/{supabase_path}"
    
    # Vérifier si le fichier existe déjà sur Supabase
    check_res = requests.get(upload_url, headers=headers)
    if check_res.status_code == 200:
        print(f"{filename} existe deja sur Supabase. Passage a la mise a jour en DB.")
    else:
        # Envoyer le fichier
        print(f"Upload de {filename} vers Supabase Storage...")
        with open(file_path, "rb") as f:
            upload_res = requests.post(
                upload_url,
                headers=headers,
                files={"file": (filename, f, "image/jpeg")}
            )
            if upload_res.status_code not in [200, 201]:
                print(f"Echec de l'upload pour {filename}: {upload_res.text}")
                continue

    # URL publique finale sur Supabase Storage
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/media/{supabase_path}"
    
    # 2. Mettre à jour la DB Supabase
    # Remplacer les chemins relatifs locaux par l'URL publique Supabase
    local_ref_path = f"media/listing/{filename}"
    
    # Mettre à jour le champ image principal
    cur.execute(
        "UPDATE listings SET image = %s WHERE image = %s OR image = %s",
        (public_url, local_ref_path, filename)
    )
    
    # Mettre à jour la table des media_files
    cur.execute(
        "UPDATE media_files SET url = %s, storage_provider = 'supabase' WHERE file_path = %s",
        (public_url, local_ref_path)
    )

conn.commit()
print("Synchronisation des images sur Supabase terminee !")
cur.close()
conn.close()
