from app.database import SessionLocal
from app import models

db = SessionLocal()
users = db.query(models.User).all()
for u in users:
    print(f"Email: {u.email} | Username: {u.username} | Role: {u.role}")
db.close()
