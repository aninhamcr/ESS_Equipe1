from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.equipment import ComputerReservation, ComputerReservationStatus
from schemas.admin_equipment_reservation import (
    AdminEquipmentReservationActionResponse,
    AdminEquipmentReservationDetail,
)
from schemas.equipment import ComputerReservationResponse


router = APIRouter(
    prefix="/api/admin/equipment-reservations",
    tags=["Administração de Reservas de Computadores"],
)


def _get_reservation(db: Session, reservation_id: int) -> ComputerReservation:
    reservation = (
        db.query(ComputerReservation)
        .filter(ComputerReservation.id == reservation_id)
        .first()
    )
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


@router.get("", response_model=List[ComputerReservationResponse])
def list_all_equipment_reservations(
    db: Session = Depends(get_db),
) -> list[ComputerReservation]:
    return (
        db.query(ComputerReservation)
        .order_by(ComputerReservation.start_time.asc())
        .all()
    )


@router.get(
    "/{reservation_id}",
    response_model=AdminEquipmentReservationDetail,
)
def get_equipment_reservation_detail(
    reservation_id: int,
    db: Session = Depends(get_db),
) -> AdminEquipmentReservationDetail:
    reservation = _get_reservation(db, reservation_id)
    allowed = (
        ["confirm", "deny"]
        if reservation.status == ComputerReservationStatus.pending
        else []
    )
    return AdminEquipmentReservationDetail(
        **ComputerReservationResponse.model_validate(reservation).model_dump(),
        allowed_actions=allowed,
    )


def _decide(
    db: Session,
    reservation_id: int,
    new_status: ComputerReservationStatus,
    message: str,
) -> AdminEquipmentReservationActionResponse:
    reservation = _get_reservation(db, reservation_id)
    if reservation.status != ComputerReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation has already been decided",
        )

    reservation.status = new_status
    db.commit()
    db.refresh(reservation)
    return AdminEquipmentReservationActionResponse(
        message=message,
        reservation=ComputerReservationResponse.model_validate(reservation),
    )


@router.patch(
    "/{reservation_id}/confirm",
    response_model=AdminEquipmentReservationActionResponse,
)
def confirm_equipment_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
):
    return _decide(
        db,
        reservation_id,
        ComputerReservationStatus.confirmed,
        "Computer reservation confirmed successfully",
    )


@router.patch(
    "/{reservation_id}/deny",
    response_model=AdminEquipmentReservationActionResponse,
)
def deny_equipment_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
):
    return _decide(
        db,
        reservation_id,
        ComputerReservationStatus.denied,
        "Computer reservation denied successfully",
    )
