from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.equipment import ComputerReservation, ComputerReservationStatus
from models.reservation import Reservation, ReservationStatus
from models.room import Room, RoomMaintenanceStatus
from models.user import User
from schemas.equipment import ComputerReservationCreate, ComputerReservationUpdate


ACTIVE_EQUIPMENT_STATUSES = [
    ComputerReservationStatus.pending,
    ComputerReservationStatus.confirmed,
]
ACTIVE_ROOM_STATUSES = [
    ReservationStatus.pending,
    ReservationStatus.confirmed,
]


def get_active_user(db: Session, user_cpf: str, user_name: str | None = None) -> User:
    user = db.query(User).filter(User.cpf == user_cpf).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot manage reservations",
        )
    if user_name is not None and user.nome != user_name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User data does not match the registered account",
        )
    return user


def get_room(db: Session, room_name: str) -> Room:
    room = db.query(Room).filter(Room.name == room_name).first()
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


def check_room_maintenance(room: Room) -> None:
    if room.maintenance_status != RoomMaintenanceStatus.no:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is under maintenance. Computer reservation not allowed",
        )


def check_user_time_conflict(
    db: Session,
    user_cpf: str,
    start_time,
    end_time,
    exclude_equipment_id: int | None = None,
) -> None:
    equipment_query = db.query(ComputerReservation).filter(
        ComputerReservation.user_cpf == user_cpf,
        ComputerReservation.status.in_(ACTIVE_EQUIPMENT_STATUSES),
        ComputerReservation.start_time < end_time,
        ComputerReservation.end_time > start_time,
    )
    if exclude_equipment_id is not None:
        equipment_query = equipment_query.filter(
            ComputerReservation.id != exclude_equipment_id
        )

    room_reservation = db.query(Reservation).filter(
        Reservation.user_cpf == user_cpf,
        Reservation.status.in_(ACTIVE_ROOM_STATUSES),
        Reservation.start_time < end_time,
        Reservation.end_time > start_time,
    ).first()

    if equipment_query.first() or room_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a reservation at this time",
        )


def check_room_computer_capacity(
    db: Session,
    room: Room,
    start_time,
    end_time,
    requested_quantity: int,
    exclude_id: int | None = None,
) -> None:
    query = db.query(ComputerReservation).filter(
        ComputerReservation.room == room.name,
        ComputerReservation.status.in_(ACTIVE_EQUIPMENT_STATUSES),
        ComputerReservation.start_time < end_time,
        ComputerReservation.end_time > start_time,
    )
    if exclude_id is not None:
        query = query.filter(ComputerReservation.id != exclude_id)

    reserved_quantity = sum(
        reservation.computer_quantity for reservation in query.all()
    )
    available_quantity = room.computers - reserved_quantity
    if requested_quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only {available_quantity} computers are available "
                f"in room '{room.name}' for this time"
            ),
        )


def create_computer_reservation(
    db: Session,
    user_cpf: str,
    user_name: str,
    data: ComputerReservationCreate,
) -> ComputerReservation:
    user = get_active_user(db, user_cpf, user_name)
    room = get_room(db, data.room)
    check_room_maintenance(room)
    check_user_time_conflict(db, user.cpf, data.start_time, data.end_time)
    check_room_computer_capacity(
        db,
        room,
        data.start_time,
        data.end_time,
        data.computer_quantity,
    )

    reservation = ComputerReservation(
        user_cpf=user.cpf,
        user_name=user.nome,
        room=room.name,
        computer_quantity=data.computer_quantity,
        start_time=data.start_time,
        end_time=data.end_time,
        status=ComputerReservationStatus.pending,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def list_computer_reservations(
    db: Session,
    user_cpf: str,
) -> list[ComputerReservation]:
    get_active_user(db, user_cpf)
    return (
        db.query(ComputerReservation)
        .filter(ComputerReservation.user_cpf == user_cpf)
        .order_by(ComputerReservation.start_time.desc())
        .all()
    )


def update_computer_reservation(
    db: Session,
    reservation_id: int,
    user_cpf: str,
    data: ComputerReservationUpdate,
) -> ComputerReservation:
    get_active_user(db, user_cpf)
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
    if reservation.user_cpf != user_cpf:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    if reservation.status != ComputerReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending reservations can be edited",
        )

    new_room_name = data.room if data.room is not None else reservation.room
    new_quantity = (
        data.computer_quantity
        if data.computer_quantity is not None
        else reservation.computer_quantity
    )
    new_start = (
        data.start_time if data.start_time is not None else reservation.start_time
    )
    new_end = data.end_time if data.end_time is not None else reservation.end_time

    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    room = get_room(db, new_room_name)
    check_room_maintenance(room)
    check_user_time_conflict(
        db,
        user_cpf,
        new_start,
        new_end,
        exclude_equipment_id=reservation_id,
    )
    check_room_computer_capacity(
        db,
        room,
        new_start,
        new_end,
        new_quantity,
        exclude_id=reservation_id,
    )

    reservation.room = room.name
    reservation.computer_quantity = new_quantity
    reservation.start_time = new_start
    reservation.end_time = new_end
    db.commit()
    db.refresh(reservation)
    return reservation


def cancel_computer_reservation(
    db: Session,
    reservation_id: int,
    user_cpf: str,
) -> None:
    get_active_user(db, user_cpf)
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
    if reservation.user_cpf != user_cpf:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    if reservation.status != ComputerReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending reservations can be canceled",
        )

    db.delete(reservation)
    db.commit()
