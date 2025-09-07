from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
import os

def run():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email or not password:
        print("ADMIN_EMAIL / ADMIN_PASSWORD missing — skip")
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if not user.is_admin:
                user.is_admin = True
                db.commit()
            print("Admin already exists")
            return
        user = User(email=email, hashed_password=get_password_hash(password), is_admin=True)
        db.add(user)
        db.commit()
        print("Admin created")
    finally:
        db.close()

if __name__ == "__main__":
    run()
