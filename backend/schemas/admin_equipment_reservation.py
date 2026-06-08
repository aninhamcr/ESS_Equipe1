from __future__ import annotations

from typing import List

from pydantic import BaseModel

from schemas.equipment import ComputerReservationResponse


class AdminEquipmentReservationDetail(ComputerReservationResponse):
    allowed_actions: List[str]


class AdminEquipmentReservationActionResponse(BaseModel):
    message: str
    reservation: ComputerReservationResponse
