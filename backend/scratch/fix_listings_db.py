import sqlite3

conn = sqlite3.connect("isoko.db")
c = conn.cursor()

# Remplacer /assets/ par media/listing/ dans image_urls
c.execute("UPDATE listings SET image_urls = REPLACE(image_urls, '/assets/', 'media/listing/') WHERE image_urls LIKE '%/assets/%'")
print(f"{c.rowcount} annonces mises a jour.")

# Vérifier le résultat
c.execute("SELECT id, title, image_urls FROM listings")
for r in c.fetchall():
    print(r)

conn.commit()
conn.close()
print("Terminé.")
