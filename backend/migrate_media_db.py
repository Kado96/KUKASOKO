import sqlite3

def run():
    conn = sqlite3.connect('isoko.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE listings SET image_urls = REPLACE(image_urls, '/uploads/', '/media/') WHERE image_urls LIKE '%/uploads/%'")
    conn.commit()
    print('Rows updated:', cursor.rowcount)
    conn.close()

if __name__ == '__main__':
    run()
