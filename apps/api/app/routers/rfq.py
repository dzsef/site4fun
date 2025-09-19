from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional


router = APIRouter()


class RFQ(BaseModel):
    """
    Pydantic model representing a Request For Quote.
    """
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    created_at: datetime = datetime.utcnow()


# Simple in-memory storage for demonstration purposes
rfq_storage: List[RFQ] = []


@router.post("/rfq", response_model=RFQ)
async def create_rfq(rfq: RFQ) -> RFQ:
    """
    Store a new RFQ in memory and return it. In a real application this would
    persist to a database and possibly trigger email notifications.
    """
    rfq_storage.append(rfq)
    return rfq


@router.get("/rfq", response_model=List[RFQ])
async def list_rfqs() -> List[RFQ]:
    """
    Return all stored RFQs.
    """
    return rfq_storage