"""
routes/test_utils.py

Rotas utilitárias EXCLUSIVAS para ambiente de testes.
Só são registradas quando ENV=test no .env.

NUNCA registrar esse router em produção.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.reservation import Reservation

router = APIRouter(prefix="/test", tags=["Test Utils"])

CPFS_PERMITIDOS = [
    "61622051009",
    "81081395036",
    "97405315046",
]


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