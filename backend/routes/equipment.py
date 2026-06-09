from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models.equipment import ComputerReservation
from schemas.equipment import ComputerReservationCreate, ComputerReservationResponse, ComputerReservationUpdate
from services.equipment import (
    cancel_computer_reservation as cancel_computer_reservation_service,
    create_computer_reservation as create_computer_reservation_service,
    list_computer_reservations as list_computer_reservations_service,
    update_computer_reservation as update_computer_reservation_service,
)

router = APIRouter(prefix="/api/equipment/reservations", tags=["Reservas de Computadores"])

@router.post("/", response_model=ComputerReservationResponse, status_code=status.HTTP_201_CREATED)
def create_computer_reservation(
    payload: ComputerReservationCreate,
    user_cpf: str = Query(..., description="CPF do usuario"),
    user_name: str = Query(..., description="Nome do usuario"),
    db: Session = Depends(get_db),
) -> ComputerReservation:
    return create_computer_reservation_service(
        db,
        user_cpf,
        user_name,
        payload,
    )


@router.get("/", response_model=List[ComputerReservationResponse])
def list_computer_reservations(
    user_cpf: str = Query(..., description="CPF do usuario"),
    db: Session = Depends(get_db),
) -> list[ComputerReservation]:
    return list_computer_reservations_service(db, user_cpf)


@router.put("/{reservation_id}", response_model=ComputerReservationResponse)
def update_computer_reservation(
    reservation_id: int,
    payload: ComputerReservationUpdate,
    user_cpf: str = Query(..., description="CPF do usuario"),
    db: Session = Depends(get_db),
) -> ComputerReservation:
    return update_computer_reservation_service(
        db,
        reservation_id,
        user_cpf,
        payload,
    )


@router.delete(
    "/{reservation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
def cancel_computer_reservation(
    reservation_id: int,
    user_cpf: str = Query(..., description="CPF do usuario"),
    db: Session = Depends(get_db),
) -> None:
    cancel_computer_reservation_service(db, reservation_id, user_cpf)
