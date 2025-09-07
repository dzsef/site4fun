from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.schemas.rfq import RFQCreate, RFQOut
from app.models.rfq import RFQ
from app.models.user import User
import jwt
from app.core.config import settings

router = APIRouter(prefix="/rfq", tags=["rfq"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_admin(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split()[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])  # type: ignore
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return user

@router.post("/", response_model=RFQOut, status_code=201)
def create_rfq(data: RFQCreate, db: Session = Depends(get_db)):
    rfq = RFQ(**data.model_dump())
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq

@router.get("/", response_model=List[RFQOut])
def list_rfqs(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(RFQ).order_by(RFQ.created_at.desc()).all()

@router.put("/{rfq_id}/status", response_model=RFQOut)
def update_status(rfq_id: int, status_str: str, _: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    rfq = db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(404, "RFQ not found")
    rfq.status = status_str
    db.commit()
    db.refresh(rfq)
    return rfq
