"""
Mensagens de erro da Feature 7 (Reserva e manutenção de reservas).

Centralizar as mensagens aqui evita strings mágicas espalhadas e duplicação
entre as operações de criar/editar/cancelar (Clean Code). A camada de serviço
(``services/reservation.py``) é a única fonte dessas mensagens; as rotas apenas
propagam o ``HTTPException`` levantado pelo serviço.
"""
from __future__ import annotations


class ReservationMessages:
    """Mensagens de erro da camada de serviço de reservas."""

    # Autenticação / usuário
    USER_NOT_FOUND = "Usuário não encontrado"
    INVALID_CREDENTIALS = "Credenciais inválidas"
    ACCOUNT_DISABLED = "Conta desativada: não é possível realizar reservas"

    # Sala
    ROOM_NOT_FOUND = "Sala não encontrada"
    ROOM_UNDER_MAINTENANCE = "Sala em manutenção ou com manutenção agendada"

    # Período
    START_IN_PAST = "Não é possível criar reservas com data/hora de início no passado"
    END_NOT_AFTER_START = "O horário de fim deve ser posterior ao horário de início"

    # Conflitos
    CONFIRMED_CONFLICT = "Conflito de horário: a sala já está reservada neste período"
    USER_TIME_CONFLICT = "Você já possui uma reserva neste horário"

    # Edição / cancelamento
    RESERVATION_NOT_FOUND = "Reserva não encontrada"
    NOT_OWNER = "Acesso negado: você não é o dono desta reserva"
    ONLY_PENDING_EDITABLE = "Só é possível editar/excluir reservas pendentes"
