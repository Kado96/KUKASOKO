import sqlite3

conn = sqlite3.connect('isoko.db')
c = conn.cursor()

# Sauvegarder les données existantes
c.execute('SELECT COUNT(*) FROM listings')
count = c.fetchone()[0]
print(f'Listings existants: {count}')

# Désactiver les foreign keys temporairement
c.execute('PRAGMA foreign_keys = OFF')

# Créer la nouvelle table avec seller_id nullable
c.execute('''
CREATE TABLE listings_new (
    id INTEGER NOT NULL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    price FLOAT NOT NULL,
    currency VARCHAR,
    status VARCHAR(6),
    latitude FLOAT,
    longitude FLOAT,
    address VARCHAR,
    city VARCHAR,
    image_urls TEXT,
    seller_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    views INTEGER,
    is_featured BOOLEAN,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    guest_token VARCHAR,
    guest_name VARCHAR,
    guest_phone VARCHAR
)
''')

# Copier les données
c.execute('''
INSERT INTO listings_new 
    (id, title, description, price, currency, status, latitude, longitude, 
     address, city, image_urls, seller_id, category_id, views, is_featured, 
     expires_at, created_at, updated_at, guest_token, guest_name, guest_phone)
SELECT 
    id, title, description, price, currency, status, latitude, longitude, 
    address, city, image_urls, seller_id, category_id, views, is_featured, 
    expires_at, created_at, updated_at, guest_token, guest_name, guest_phone
FROM listings
''')

# Supprimer l'ancienne table et renommer
c.execute('DROP TABLE listings')
c.execute('ALTER TABLE listings_new RENAME TO listings')

# Recréer les index
c.execute('CREATE INDEX IF NOT EXISTS ix_listings_id ON listings (id)')
c.execute('CREATE INDEX IF NOT EXISTS ix_listings_guest_token ON listings (guest_token)')

# Réactiver foreign keys
c.execute('PRAGMA foreign_keys = ON')

conn.commit()

# Vérifier
c.execute('PRAGMA table_info(listings)')
cols = c.fetchall()
for col in cols:
    print(col)

conn.close()
print('Migration terminee : seller_id est maintenant nullable !')
