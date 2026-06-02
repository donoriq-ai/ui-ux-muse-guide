from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TenantModel(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    confidence_threshold: Mapped[float] = mapped_column(default=0.8)
    gestational_age_policy_weeks: Mapped[int] = mapped_column(default=20)
