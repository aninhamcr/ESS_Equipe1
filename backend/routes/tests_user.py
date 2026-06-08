"""
routes/test_utils.py

Rotas utilitárias EXCLUSIVAS para ambiente de testes.
Só são registradas quando ENV=test no .env.

NUNCA registrar esse router em produção.
"""

from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from models.reservation import Reservation, ReservationStatus
from models.room import Room, RoomMaintenanceStatus
from models.maintenance import MaintenanceRequest, MaintenanceStatus

router = APIRouter(prefix="/test", tags=["Test Utils"])

CPFS_PERMITIDOS = [
    "61622051009",
    "81081395036",
    "97405315046",
]

# Salas usadas exclusivamente pelos testes de GUI (Cypress).
SALAS_TESTE = ["D005", "E101"]

# Docente usado apenas para semear manutenções de teste.
CPF_DOCENTE_MANUTENCAO = "97405315046"


@router.delete("/users/{cpf}", status_code=204)
def deletar_usuario_teste(cpf: str, db: Session = Depends(get_db)):
    """
    Deleta um usuário de teste pelo CPF.
    Só funciona para CPFs da lista de testes permitidos.
    """
    if cpf not in CPFS_PERMITIDOS:
        raise HTTPException(
            status_code=403,
            detail="Este endpoint só pode deletar usuários de teste cadastrados."
        )

    user = db.query(User).filter(User.cpf == cpf).first()
    if not user:
        return

    # Remove reservas associadas antes de remover o usuário
    db.query(Reservation).filter(Reservation.user_cpf == cpf).delete()
    db.delete(user)
    db.commit()


@router.delete("/users", status_code=204)
def deletar_todos_usuarios_teste(db: Session = Depends(get_db)):
    """
    Deleta todos os usuários de teste de uma vez.
    Útil para limpar o banco antes de uma suite de testes.
    """
    db.query(Reservation).filter(
        Reservation.user_cpf.in_(CPFS_PERMITIDOS)
    ).delete(synchronize_session=False)

    db.query(User).filter(
        User.cpf.in_(CPFS_PERMITIDOS)
    ).delete(synchronize_session=False)

    db.commit()


# ── Utilitários de reserva/sala para os testes de GUI ─────────────────────────

@router.post("/rooms/seed", status_code=200)
def semear_salas_teste(db: Session = Depends(get_db)):
    """
    Garante que as salas de teste existam e estejam livres de manutenção.
    Idempotente: cria as que faltam e reseta o estado das existentes.
    """
    for nome in SALAS_TESTE:
        sala = db.query(Room).filter(Room.name == nome).first()
        if sala is None:
            db.add(Room(
                name=nome,
                capacity=30,
                description="Sala de testes automatizados",
                computers=10,
                maintenance_status=RoomMaintenanceStatus.no,
                is_reserved=False,
            ))
        else:
            sala.maintenance_status = RoomMaintenanceStatus.no
            sala.is_reserved = False
    db.commit()
    return {"salas": SALAS_TESTE}


@router.delete("/reservations", status_code=204)
def deletar_reservas_teste(db: Session = Depends(get_db)):
    """Remove todas as reservas dos CPFs de teste (sem apagar os usuários)."""
    db.query(Reservation).filter(
        Reservation.user_cpf.in_(CPFS_PERMITIDOS)
    ).delete(synchronize_session=False)
    db.commit()


class SeedReservation(BaseModel):
    user_cpf: str
    user_name: str
    room: str
    start_time: datetime
    end_time: datetime
    status: str = "confirmed"
    user_type: Optional[str] = None


@router.post("/reservations/seed", status_code=201)
def semear_reserva_teste(data: SeedReservation, db: Session = Depends(get_db)):
    """
    Cria uma reserva com um status arbitrário (ex.: 'confirmed') para um CPF de teste.
    Útil para cenários de GUI que dependem de reservas já confirmadas ou de conflito.
    """
    if data.user_cpf not in CPFS_PERMITIDOS:
        raise HTTPException(
            status_code=403,
            detail="Só é permitido semear reservas para CPFs de teste.",
        )
    try:
        status_enum = ReservationStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Status inválido: {data.status}")

    reserva = Reservation(
        user_cpf=data.user_cpf,
        user_name=data.user_name,
        user_type=data.user_type,
        room=data.room,
        start_time=data.start_time,
        end_time=data.end_time,
        status=status_enum,
    )
    db.add(reserva)
    db.commit()
    db.refresh(reserva)
    return {"id": reserva.id, "status": reserva.status.value, "room": reserva.room}


@router.delete("/maintenance", status_code=204)
def deletar_manutencoes_teste(db: Session = Depends(get_db)):
    """
    Remove manutenções das salas de teste. Deve rodar ANTES de apagar usuários
    (a FK teacher_cpf -> users.cpf impede apagar o docente antes da manutenção).
    """
    db.query(MaintenanceRequest).filter(
        MaintenanceRequest.room.in_(SALAS_TESTE)
    ).delete(synchronize_session=False)
    db.commit()


class SeedMaintenance(BaseModel):
    room: str
    start_date: date
    end_date: date


@router.post("/maintenance/seed", status_code=201)
def semear_manutencao_teste(data: SeedMaintenance, db: Session = Depends(get_db)):
    """Cria uma manutenção confirmada para uma sala de teste no período informado."""
    # Garante o docente responsável (FK obrigatória).
    if db.query(User).filter(User.cpf == CPF_DOCENTE_MANUTENCAO).first() is None:
        db.add(User(
            nome="Docente Manutencao",
            cpf=CPF_DOCENTE_MANUTENCAO,
            status=True,
            senha="senha-manutencao",
            tipo=UserRole.DOCENTE,
            siape=CPF_DOCENTE_MANUTENCAO,
        ))
        db.commit()

    manutencao = MaintenanceRequest(
        teacher_cpf=CPF_DOCENTE_MANUTENCAO,
        teacher_name="Docente Manutencao",
        room=data.room,
        description="Manutencao agendada (teste)",
        status=MaintenanceStatus.confirmed,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(manutencao)
    db.commit()
    db.refresh(manutencao)
    return {"id": manutencao.id, "room": manutencao.room}
