import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from app.core.database import Base

class WellbeingCheckIn(Base):
    __tablename__ = "wellbeing_checkins"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # State: 'energized' | 'focused' | 'overwhelmed' | 'exhausted'
    state = Column(String(50), nullable=False)
    
    # Stress level: 1 (calm) to 5 (extreme distress)
    stress_level = Column(Float, default=2.0)
    
    # Self-reported sleep hours (optional)
    sleep_hours = Column(Float, nullable=True)
    
    # Optional personal reflection / context
    notes = Column(Text, nullable=True)
    
    # Calculated burnout risk: 'low' | 'moderate' | 'high'
    burnout_risk = Column(String(30), default="low")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
