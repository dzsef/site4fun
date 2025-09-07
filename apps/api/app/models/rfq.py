from sqlalchemy import Column, Date, DateTime, Integer, String, Text, func
from app.db.base import Base

class RFQ(Base):
    __tablename__ = "rfqs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    company = Column(String(200), nullable=True)
    email = Column(String(320), nullable=False)
    phone = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    project_type = Column(String(120), nullable=True)
    budget_range = Column(String(120), nullable=True)
    start_date = Column(Date, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(30), default="new")  # new/contacted/qualified/archived
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
