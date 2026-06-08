"""
Feature: Admin Tools

Endpoints utilitários expostos apenas para administradores. Sem autenticação
formal (segue o padrão do resto do projeto) — espera-se que a UI só ofereça
estas operações para usuários cujo `tipo == admin`.

Endpoints:
  GET   /api/admin/tools/users                       → lista todos os usuários
  PATCH /api/admin/tools/users/{user_id}/tipo        → troca o tipo livremente
  POST  /api/admin/tools/seed-reservations           → gera reservas em lote
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from models.reservation import Reservation, ReservationStatus
from models.room import Room
from schemas.user import UserResponse


router = APIRouter(prefix="/api/admin/tools", tags=["Admin Tools"])


# ── Schemas ────────────────────────────────────────────────────────────────

class ChangeUserTypeRequest(BaseModel):
    """Troca o tipo de um usuário livremente entre discente/docente/admin."""
    tipo: UserRole


class SeedReservationsRequest(BaseModel):
    """
    Configuração do gerador de reservas em lote.

    - role: filtra users do banco pelo tipo escolhido (ou mistura discente+docente).
    - status: status inicial das reservas criadas (random sorteia entre os 3).
    - room: nome da sala alvo; se None, sorteia entre as cadastradas.
    - days_window: janela em dias a partir de hoje para sortear o start_time.
    """
    count: int = Field(..., ge=1, le=100)
    role: Literal["discente", "docente", "mixed"] = "mixed"
    status: Literal["pending", "confirmed", "denied", "random"] = "pending"
    room: Optional[str] = None
    days_window: int = Field(14, ge=1, le=180)


class SeedReservationsResponse(BaseModel):
    created: int
    message: str


# ── Listagem de usuários ───────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="Listar todos os usuários (admin tools)",
)
def list_users(db: Session = Depends(get_db)) -> List[User]:
    return db.query(User).order_by(User.nome.asc()).all()


# ── Troca de tipo ──────────────────────────────────────────────────────────

@router.patch(
    "/users/{user_id}/tipo",
    response_model=UserResponse,
    summary="Trocar tipo do usuário (discente/docente/admin)",
)
def change_user_type(
    user_id: int,
    payload: ChangeUserTypeRequest,
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.tipo = payload.tipo
    db.commit()
    db.refresh(user)
    return user


# ── Gerador de reservas ────────────────────────────────────────────────────

def _pick_status(choice: str) -> ReservationStatus:
    if choice == "random":
        return random.choice([
            ReservationStatus.pending,
            ReservationStatus.confirmed,
            ReservationStatus.denied,
        ])
    return ReservationStatus(choice)


def _random_window(days_window: int) -> tuple[datetime, datetime]:
    # Sorteia um dia entre hoje e +days_window, horário comercial (7h-18h),
    # com duração de 1 a 3 horas.
    base = datetime.now().replace(minute=0, second=0, microsecond=0)
    day_offset = random.randint(0, days_window)
    hour = random.randint(7, 17)
    duration_hours = random.randint(1, 3)
    start = (base + timedelta(days=day_offset)).replace(hour=hour, minute=0)
    end = start + timedelta(hours=duration_hours)
    return start, end


@router.post(
    "/seed-reservations",
    response_model=SeedReservationsResponse,
    summary="Gerar reservas em lote para testes",
)
def seed_reservations(
    payload: SeedReservationsRequest,
    db: Session = Depends(get_db),
) -> SeedReservationsResponse:
    # Filtra users elegíveis pelo papel
    role_filter = {
        "discente": [UserRole.DISCENTE],
        "docente": [UserRole.DOCENTE],
        "mixed":   [UserRole.DISCENTE, UserRole.DOCENTE],
    }[payload.role]

    users = (
        db.query(User)
        .filter(User.tipo.in_(role_filter), User.status.is_(True))
        .all()
    )
    if not users:
        raise HTTPException(
            status_code=400,
            detail="Nenhum usuário disponível para o papel selecionado",
        )

    # Resolve as salas disponíveis
    if payload.room:
        rooms = db.query(Room).filter(Room.name == payload.room).all()
        if not rooms:
            raise HTTPException(status_code=404, detail=f"Sala '{payload.room}' não encontrada")
    else:
        rooms = db.query(Room).all()
        if not rooms:
            raise HTTPException(status_code=400, detail="Nenhuma sala cadastrada para gerar reservas")

    created = 0
    for _ in range(payload.count):
        user = random.choice(users)
        room = random.choice(rooms)
        start_time, end_time = _random_window(payload.days_window)

        reservation = Reservation(
            user_cpf=user.cpf,
            user_name=user.nome,
            user_type=user.tipo.value,
            room=room.name,
            start_time=start_time,
            end_time=end_time,
            status=_pick_status(payload.status),
        )
        db.add(reservation)
        created += 1

    db.commit()

    return SeedReservationsResponse(
        created=created,
        message=f"{created} reserva(s) gerada(s) com sucesso",
    )
