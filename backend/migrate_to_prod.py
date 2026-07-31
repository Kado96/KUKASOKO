import os
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Connexions aux deux bases
SQLITE_PATH = "isoko.db"
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or "VOTRE_MOT_DE_PASSE" in POSTGRES_URL:
    print("Erreur : DATABASE_URL n'est pas configure correctement dans le fichier .env")
    exit(1)

print("Connexion a la base SQLite locale...")
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_cur = sqlite_conn.cursor()

print("Connexion a la base PostgreSQL Supabase de production...")
try:
    pg_conn = psycopg2.connect(POSTGRES_URL)
    pg_cur = pg_conn.cursor()
except Exception as e:
    print(f"Impossible de se connecter a PostgreSQL : {e}")
    exit(1)

# Liste ordonnée de toutes les tables SQLite de la base
tables = [
    "users",
    "categories",
    "merchant_profiles",
    "listings",
    "media_files",
    "reviews",
    "messages",
    "delivery_sessions",
    "reports"
]

# Champs identifiés comme booléens à forcer en True/False
BOOLEAN_FIELDS = [
    "is_active", "is_admin", "is_verified", "is_approved", "is_read",
    "is_negotiable", "is_featured", "is_delivery_available", "is_owner_delivery"
]

def migrate_table(table_name):
    print(f"Migration de la table : {table_name}...")
    
    # 1. Récupérer les données locales de SQLite
    sqlite_cur.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in sqlite_cur.fetchall()]
    col_str = ", ".join([f'"{c}"' for c in columns])
    
    sqlite_cur.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cur.fetchall()
    
    if not rows:
        print(f"La table {table_name} est vide localement. Nettoyage de la table distante quand meme...")
        pg_cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
        return

    # 2. Vider la table distante pour éviter les doublons ou conflits de clés primaires
    print(f"Nettoyage de la table distante {table_name}...")
    pg_cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')

    # 3. Insérer les données dans PostgreSQL
    placeholders = ", ".join(["%s"] * len(columns))
    insert_query = f'INSERT INTO "{table_name}" ({col_str}) VALUES ({placeholders})'
    
    adapted_rows = []
    for row in rows:
        adapted_row = list(row)
        for i, val in enumerate(adapted_row):
            # Convertir les champs booléens de 0/1 à True/False
            if columns[i] in BOOLEAN_FIELDS:
                if val is not None:
                    adapted_row[i] = bool(val)
        adapted_rows.append(tuple(adapted_row))

    execute_values(pg_cur, f'INSERT INTO "{table_name}" ({col_str}) VALUES %s', adapted_rows)
    print(f"{len(rows)} lignes inserees dans {table_name}.")

try:
    for table in tables:
        migrate_table(table)
    
    # Fixer les séquences d'auto-incrément dans PostgreSQL pour éviter les conflits d'ID futurs
    print("Ajustement des auto-incréments (sequences)...")
    for table in tables:
        # Vérifier si la table a une colonne id auto-incrémentée (type SERIAL / sequence)
        pg_cur.execute(f"""
            SELECT EXISTS (
                SELECT 1 FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE c.relname = '{table}_id_seq' AND n.nspname = 'public'
            );
        """)
        seq_exists = pg_cur.fetchone()[0]
        if seq_exists:
            pg_cur.execute(f"SELECT setval('{table}_id_seq', COALESCE((SELECT MAX(id)+1 FROM \"{table}\"), 1), false);")

    pg_conn.commit()
    print("MIGRATION TERMINEE AVEC SUCCES ! Toutes les donnees locales sont sur Supabase.")

except Exception as e:
    pg_conn.rollback()
    print(f"Erreur lors de la migration : {e}")

finally:
    sqlite_conn.close()
    pg_conn.close()
