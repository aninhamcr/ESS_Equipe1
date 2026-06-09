import unicodedata
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
import models.reservation
import models.room
import models.user
import models.maintenance
from models.reservation import Reservation, ReservationStatus
from models.room import Room, RoomMaintenanceStatus
from models.user import User, UserRole
from models.maintenance import MaintenanceRequest, MaintenanceStatus
from main import app

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Banco em memoria ──────────────────────────────────────────────────────────
engine_test = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionTest = sessionmaker(bind=engine_test, autocommit=False, autoflush=False)


def override_get_db():
    db = SessionTest()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

scenarios("features/reservation_management.feature")

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True, scope="session")
def create_tables():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(autouse=True)
def clean_database():
    db = SessionTest()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    for nome in ["D005", "E101"]:
        db.add(Room(
            name=nome,
            capacity=30,
            description="Sala de testes",
            computers=10,
            maintenance_status=RoomMaintenanceStatus.no,
            is_reserved=False,
        ))
    db.commit()
    db.close()
    yield
    db = SessionTest()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()


@pytest.fixture(autouse=True)
def ensure_db_override():
    app.dependency_overrides[get_db] = override_get_db
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def context():
    return {}


# ── Utilitarios ───────────────────────────────────────────────────────────────

def _parse_dt(dt_str: str) -> datetime:
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Formato de data invalido: {dt_str}")


def _normalize(text: str) -> str:
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode("ascii").lower()


_TIPO_MAP = {
    "discente": UserRole.DISCENTE,
    "docente": UserRole.DOCENTE,
    "admin": UserRole.ADMIN,
}

_MAINTENANCE_MAP = {
    "Sim": RoomMaintenanceStatus.yes,
    "Não": RoomMaintenanceStatus.no,
    "Agendada": RoomMaintenanceStatus.scheduled,
}

STATUS_MAP = {
    "pending": ReservationStatus.pending,
    "confirmed": ReservationStatus.confirmed,
    "denied": ReservationStatus.denied,
    "completed": ReservationStatus.completed,
}


def _insert_user(cpf: str, tipo: str, ativo: bool = True) -> None:
    db = SessionTest()
    if db.query(User).filter(User.cpf == cpf).first() is None:
        db.add(User(
            nome=f"Usuario {cpf}",
            cpf=cpf,
            status=ativo,
            senha="senha_hash",
            tipo=_TIPO_MAP[tipo],
        ))
        db.commit()
    db.close()


def _insert_reservation(user_cpf, room, start, end, status):
    db = SessionTest()
    r = Reservation(
        user_cpf=user_cpf,
        user_name=f"Usuario {user_cpf}",
        room=room,
        start_time=_parse_dt(start),
        end_time=_parse_dt(end),
        status=status,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    rid = r.id
    db.close()
    return rid


# ── Steps: GIVEN ──────────────────────────────────────────────────────────────

_NOME_CPF: dict[str, str] = {}
_NOME_SENHA: dict[str, str] = {}


def _criar_usuario(nome, cpf, senha):
    _NOME_CPF[nome] = cpf
    db = SessionTest()
    if db.query(User).filter(User.cpf == cpf).first() is None:
        db.add(User(
            nome=nome,
            cpf=cpf,
            status=True,
            senha=senha,
            tipo=UserRole.DISCENTE,
        ))
        db.commit()
    db.close()


@given(parsers.parse('existe um usuario com nome "{nome}" CPF "{cpf}" e senha "{senha}"'))
def existe_usuario(nome, cpf, senha):
    _criar_usuario(nome, cpf, senha)


@given(parsers.parse('existe um usuario autenticado com nome "{nome}" CPF "{cpf}" e senha "{senha}"'))
def existe_usuario_autenticado(nome, cpf, senha):
    _criar_usuario(nome, cpf, senha)


@given(parsers.parse('existe um usuario autenicado com nome "{nome}" CPF "{cpf}" e senha "{senha}"'))
def existe_usuario_autenicado(nome, cpf, senha):
    _criar_usuario(nome, cpf, senha)


@given(parsers.parse('o sistema tem um usuario com nome "{nome}" CPF "{cpf}" senha "{senha}" e tipo "{tipo}"'))
def sistema_tem_usuario_completo(nome, cpf, senha, tipo):
    _NOME_CPF[nome] = cpf
    _NOME_SENHA[nome] = senha
    db = SessionTest()
    if db.query(User).filter(User.cpf == cpf).first() is None:
        db.add(User(
            nome=nome,
            cpf=cpf,
            status=True,
            senha=_pwd_context.hash(senha),
            tipo=_TIPO_MAP[tipo],
        ))
        db.commit()
    db.close()


@given(parsers.parse('o sistema tem um usuario com CPF "{cpf}" e tipo "{tipo}"'))
def sistema_tem_usuario(cpf, tipo):
    _insert_user(cpf, tipo)


@given(parsers.parse('o sistema nao possui um usuario com CPF "{cpf}"'))
def sistema_nao_possui_usuario(**_):
    pass


@given(parsers.parse('a conta do usuario com CPF "{cpf}" esta desativada'))
def conta_desativada(cpf):
    db = SessionTest()
    user = db.query(User).filter(User.cpf == cpf).first()
    user.status = False
    db.commit()
    db.close()


@given(parsers.parse('a conta de {nome} esta desativada'))
def conta_desativada_por_nome(nome):
    cpf = _NOME_CPF[nome]
    db = SessionTest()
    user = db.query(User).filter(User.cpf == cpf).first()
    user.status = False
    db.commit()
    db.close()


@given(parsers.parse('a sala "{room}" existe no sistema'))
def sala_existe_no_sistema(**_):
    pass


@given(parsers.parse('o sistema nao tem nenhuma reserva confirmada da sala "{room}" das "{start}" as "{end}"'))
def sistema_sem_reserva_confirmada(room, start, end):
    pass


@given(parsers.parse('o sistema possui uma reserva confirmada da sala "{room}" das "{start}" as "{end}"'))
def sistema_possui_reserva_confirmada(room, start, end):
    _insert_reservation("00000000191", room, start, end, ReservationStatus.confirmed)


@given(parsers.parse('o sistema possui uma reserva pendente da sala "{room}" das "{start}" as "{end}" para {nome}'))
def sistema_possui_reserva_pendente_nome(context, room, start, end, nome):
    cpf = _NOME_CPF[nome]
    rid = _insert_reservation(cpf, room, start, end, ReservationStatus.pending)
    context["reservation_id"] = rid


@given(parsers.parse('o sistema possui uma reserva pendente de ID {rid:d} da sala "{room}" das "{start}" as "{end}" para {nome}'))
def sistema_possui_reserva_pendente_id_nome(context, rid, room, start, end, nome):
    cpf = _NOME_CPF[nome]
    real_id = _insert_reservation(cpf, room, start, end, ReservationStatus.pending)
    context["reservation_id"] = real_id
    context["feature_id"] = rid


@given(parsers.parse('o sistema possui uma reserva de ID {rid:d} com status "{st}" da sala "{room}" das "{start}" as "{end}" para {nome}'))
def sistema_possui_reserva_id_status_nome(context, rid, st, room, start, end, nome):
    cpf = _NOME_CPF[nome]
    real_id = _insert_reservation(cpf, room, start, end, STATUS_MAP[st])
    context["reservation_id"] = real_id
    context["feature_id"] = rid


@given(parsers.parse('o sistema possui uma reserva pendente fixa da sala "{room}" das "{start}" as "{end}" para {nome}'))
def sistema_possui_reserva_pendente_fixa_nome(room, start, end, nome):
    cpf = _NOME_CPF[nome]
    _insert_reservation(cpf, room, start, end, ReservationStatus.pending)


@given(parsers.parse('o sistema tem a sala "{room}" com status de manutencao "{manutencao}"'))
def sistema_sala_manutencao(room, manutencao):
    db = SessionTest()
    sala = db.query(Room).filter(Room.name == room).first()
    sala.maintenance_status = _MAINTENANCE_MAP[manutencao]
    db.commit()
    db.close()


@given(parsers.parse('o sistema tem a sala "{room}" com manutencao agendada de "{start_date}" a "{end_date}"'))
def sistema_sala_manutencao_agendada(room, start_date, end_date):
    from datetime import date
    db = SessionTest()
    sala = db.query(Room).filter(Room.name == room).first()
    sala.maintenance_status = RoomMaintenanceStatus.scheduled
    db.commit()
    doc_cpf = "00000000001"
    if db.query(User).filter(User.cpf == doc_cpf).first() is None:
        db.add(User(nome="Docente Manutencao", cpf=doc_cpf, status=True, senha="senha", tipo=UserRole.DOCENTE))
        db.commit()
    db.add(MaintenanceRequest(
        teacher_cpf=doc_cpf,
        teacher_name="Docente Manutencao",
        room=room,
        description="Manutencao agendada",
        status=MaintenanceStatus.confirmed,
        start_date=date.fromisoformat(start_date),
        end_date=date.fromisoformat(end_date),
    ))
    db.commit()
    db.close()


# ── Steps: WHEN ──────────────────────────────────────────────────────────────

@when(parsers.parse('um usuario nao autenticado tenta reservar a sala "{room}" das "{start}" as "{end}"'))
def usuario_nao_autenticado_tenta_reservar(client, context, room, start, end):
    r = client.post(
        "/api/reservations/",
        json={"room": room, "start_time": start, "end_time": end},
    )
    context["response"] = r


@when(parsers.re(r'^(?P<nome>\S+) tenta reservar a sala "(?P<room>[^"]+)" das "(?P<start>[^"]+)" as "(?P<end>[^"]+)"$'))
def usuario_tenta_reservar_por_nome(client, context, nome, room, start, end):
    cpf = _NOME_CPF[nome]
    senha = _NOME_SENHA[nome]
    r = client.post(
        "/api/reservations/",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": room, "start_time": start, "end_time": end},
    )
    context["response"] = r
    if r.status_code == 201:
        context["reservation_id"] = r.json()["id"]


@when(parsers.parse('o usuario com CPF "{cpf}" nome "{nome}" e senha "{senha}" tenta reservar a sala "{room}" das "{start}" as "{end}"'))
def usuario_tenta_reservar_por_cpf(client, context, cpf, nome, senha, room, start, end):
    r = client.post(
        "/api/reservations/",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": room, "start_time": start, "end_time": end},
    )
    context["response"] = r
    if r.status_code == 201:
        context["reservation_id"] = r.json()["id"]



@when(parsers.parse('{nome} tenta editar a reserva de ID {_rid:d} alterando horario de fim para "{new_end}"'))
def usuario_tenta_editar_fim_por_nome(client, context, nome, new_end, **_):
    cpf = _NOME_CPF[nome]
    senha = _NOME_SENHA[nome]
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"end_time": new_end},
    )
    context["response"] = r


@when(parsers.parse('{nome} tenta editar a reserva de ID {_rid:d} alterando sala para "{new_room}"'))
def usuario_tenta_editar_sala_por_nome(client, context, nome, new_room, **_):
    cpf = _NOME_CPF[nome]
    senha = _NOME_SENHA[nome]
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": new_room},
    )
    context["response"] = r


@when(parsers.parse('{nome} tenta editar a reserva de ID {_rid:d} alterando sala para "{new_room}" e horario de fim para "{new_end}"'))
def usuario_tenta_editar_sala_e_fim_por_nome(client, context, nome, new_room, new_end, **_):
    cpf = _NOME_CPF[nome]
    senha = _NOME_SENHA[nome]
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": new_room, "end_time": new_end},
    )
    context["response"] = r


@when(parsers.parse('{nome} tenta cancelar a reserva de ID {_rid:d}'))
def usuario_tenta_cancelar_por_nome(client, context, nome, **_):
    cpf = _NOME_CPF[nome]
    senha = _NOME_SENHA[nome]
    r = client.delete(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
    )
    context["response"] = r


@when(parsers.parse('o usuario com CPF "{cpf}" nome "{nome}" e senha "{senha}" tenta editar a reserva de ID {_rid:d} alterando horario de fim para "{new_end}"'))
def usuario_tenta_editar_fim(client, context, cpf, nome, senha, new_end, **_):
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"end_time": new_end},
    )
    context["response"] = r


@when(parsers.parse('o usuario com CPF "{cpf}" nome "{nome}" e senha "{senha}" tenta editar a reserva de ID {_rid:d} alterando sala para "{new_room}"'))
def usuario_tenta_editar_sala(client, context, cpf, nome, senha, new_room, **_):
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": new_room},
    )
    context["response"] = r


@when(parsers.parse('o usuario com CPF "{cpf}" nome "{nome}" e senha "{senha}" tenta editar a reserva de ID {_rid:d} alterando sala para "{new_room}" e horario de fim para "{new_end}"'))
def usuario_tenta_editar_sala_e_fim(client, context, cpf, nome, senha, new_room, new_end, **_):
    r = client.put(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
        json={"room": new_room, "end_time": new_end},
    )
    context["response"] = r


@when(parsers.parse('o usuario com CPF "{cpf}" nome "{nome}" e senha "{senha}" tenta cancelar a reserva de ID {_rid:d}'))
def usuario_tenta_cancelar_id(client, context, cpf, nome, senha, **_):
    r = client.delete(
        f"/api/reservations/{context['reservation_id']}",
        headers={"X-User-Cpf": cpf, "X-User-Nome": nome, "X-User-Senha": senha},
    )
    context["response"] = r


# ── Steps: THEN ──────────────────────────────────────────────────────────────

@then(parsers.parse('o sistema armazena a reserva com status "{expected_status}"'))
def sistema_armazena_reserva(context, expected_status):
    r = context["response"]
    assert r.status_code == 201, f"Esperava 201, recebeu {r.status_code}: {r.text}"
    assert r.json()["status"] == expected_status


@then(parsers.parse('o sistema armazena a reserva com status "{expected_status}" e tipo "{expected_tipo}"'))
def sistema_armazena_reserva_tipo(context, expected_status, expected_tipo):
    r = context["response"]
    assert r.status_code == 201, f"Esperava 201, recebeu {r.status_code}: {r.text}"
    assert r.json()["status"] == expected_status
    assert r.json()["user_type"] == expected_tipo


@then(parsers.parse('o sistema armazena a reserva com status "{expected_status}" e CPF "{expected_cpf}"'))
def sistema_armazena_reserva_cpf(context, expected_status, expected_cpf):
    r = context["response"]
    assert r.status_code == 201, f"Esperava 201, recebeu {r.status_code}: {r.text}"
    assert r.json()["status"] == expected_status
    assert r.json()["user_cpf"] == expected_cpf


@then(parsers.parse('o status do usuario na reserva e "{expected_tipo}"'))
def status_usuario_na_reserva(context, expected_tipo):
    assert context["response"].json()["user_type"] == expected_tipo


@then(parsers.parse('o servidor retorna um erro de autenticacao'))
def erro_autenticacao(context):
    r = context["response"]
    assert r.status_code == 422


@then(parsers.parse('o servidor retorna um erro informando que o horario de inicio esta no passado'))
def erro_inicio_no_passado(context):
    r = context["response"]
    assert r.status_code == 400
    assert "passado" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que o horario de fim deve ser posterior ao inicio'))
def erro_fim_antes_do_inicio(context):
    r = context["response"]
    assert r.status_code in (400, 422)
    body = r.json()
    detail = body.get("detail", "")
    if isinstance(detail, list):
        detail = " ".join(str(d) for d in detail)
    assert "posterior" in _normalize(str(detail))


@then(parsers.parse('o servidor retorna um erro informando que a sala ja esta reservada neste periodo'))
def erro_sala_reservada(context):
    r = context["response"]
    assert r.status_code == 400
    assert "conflito" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que o usuario ja possui uma reserva neste horario'))
def erro_usuario_conflito(context):
    r = context["response"]
    assert r.status_code == 400
    assert "ja possui uma reserva" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que o usuario nao foi encontrado'))
def erro_usuario_nao_encontrado(context):
    r = context["response"]
    assert r.status_code == 404
    assert "nao encontrado" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o sistema nao possui nenhuma reserva com CPF "{cpf}"'))
def sistema_sem_reserva_cpf(cpf):
    db = SessionTest()
    count = db.query(Reservation).filter(Reservation.user_cpf == cpf).count()
    db.close()
    assert count == 0


@then(parsers.parse('o servidor retorna um erro informando que a conta esta desativada'))
def erro_conta_desativada(context):
    r = context["response"]
    assert r.status_code == 403
    assert "desativada" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que a sala nao foi encontrada'))
def erro_sala_nao_encontrada(context):
    r = context["response"]
    assert r.status_code == 404
    assert "sala nao encontrada" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que a sala esta em manutencao'))
def erro_sala_manutencao(context):
    r = context["response"]
    assert r.status_code == 400
    assert "manutencao" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que o usuario nao e dono da reserva'))
def erro_nao_dono(context):
    r = context["response"]
    assert r.status_code == 403
    assert "nao" in _normalize(r.json().get("detail", "")) and "dono" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o servidor retorna um erro informando que so e possivel editar reservas pendentes'))
def erro_so_pendentes(context):
    r = context["response"]
    assert r.status_code == 400
    assert "pendentes" in _normalize(r.json().get("detail", ""))


@then(parsers.parse('o sistema atualiza a sala da reserva para "{expected_room}"'))
def sistema_atualiza_sala(context, expected_room):
    r = context["response"]
    assert r.status_code == 200, f"Esperava 200, recebeu {r.status_code}: {r.text}"
    assert r.json()["room"] == expected_room


@then(parsers.parse('o sistema atualiza a sala da reserva de ID {_rid:d} para "{expected_room}"'))
def sistema_atualiza_sala_id(context, expected_room, **_):
    r = context["response"]
    assert r.status_code == 200, f"Esperava 200, recebeu {r.status_code}: {r.text}"
    assert r.json()["room"] == expected_room


@then(parsers.parse('o sistema atualiza o horario de fim da reserva para "{expected_end}"'))
def sistema_atualiza_fim(context, expected_end):
    r = context["response"]
    assert r.status_code == 200, f"Esperava 200, recebeu {r.status_code}: {r.text}"
    assert expected_end[:16] in r.json()["end_time"]


@then(parsers.parse('o status da reserva permanece "{expected}"'))
def status_permanece(context, expected):
    assert context["response"].json()["status"] == expected


@then(parsers.parse('o sistema marca a reserva com status "{expected}"'))
def sistema_marca_status(context, expected):
    db = SessionTest()
    r = db.query(Reservation).filter(Reservation.id == context["reservation_id"]).first()
    db.close()
    assert r is not None
    assert r.status.value == expected


# TESTES UNITARIOS

from datetime import date, timedelta, timezone
from fastapi import HTTPException
from services.reservation import (
    _check_confirmed_conflict,
    _check_end_after_start,
    _check_room_exists_and_available,
    _check_start_not_in_past,
    _check_user_conflict,
)
from services.reservation_messages import ReservationMessages as Msg
 
 
def test_unitario_fim_posterior_ao_inicio_nao_levanta_erro():
    # fim depois do inicio -> nao deve levantar excecao
    _check_end_after_start(datetime(2030, 6, 1, 8, 0), datetime(2030, 6, 1, 10, 0))
 
 
def test_unitario_fim_igual_ao_inicio_rejeitado():
    momento = datetime(2030, 6, 1, 8, 0)
    with pytest.raises(HTTPException) as exc:
        _check_end_after_start(momento, momento)
    assert exc.value.status_code == 400
 
 
def test_unitario_fim_antes_do_inicio_rejeitado():
    with pytest.raises(HTTPException) as exc:
        _check_end_after_start(datetime(2030, 6, 1, 10, 0), datetime(2030, 6, 1, 8, 0))
    assert exc.value.status_code == 400
    assert "posterior" in exc.value.detail.lower()
 
 
def test_unitario_inicio_no_futuro_aceito():
    futuro = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)
    _check_start_not_in_past(futuro)
 
 
def test_unitario_inicio_no_passado_rejeitado():
    with pytest.raises(HTTPException) as exc:
        _check_start_not_in_past(datetime(2020, 1, 1, 8, 0))
    assert exc.value.status_code == 400
    assert "passado" in exc.value.detail.lower()


# ── Unitarios: conflito com reserva confirmada (RN-02) ────────────────────────

def test_unitario_conflito_confirmado_bloqueia_sobreposicao():
    _insert_reservation("11111111111", "D005", "2030-07-01T09:00:00", "2030-07-01T11:00:00", ReservationStatus.confirmed)
    db = SessionTest()
    try:
        with pytest.raises(HTTPException) as exc:
            _check_confirmed_conflict(db, "D005", datetime(2030, 7, 1, 8, 0), datetime(2030, 7, 1, 10, 0))
        assert exc.value.status_code == 400
        assert exc.value.detail == Msg.CONFIRMED_CONFLICT
    finally:
        db.close()


def test_unitario_conflito_confirmado_permite_sem_sobreposicao():
    _insert_reservation("11111111111", "D005", "2030-07-01T09:00:00", "2030-07-01T11:00:00", ReservationStatus.confirmed)
    db = SessionTest()
    try:
        # 11:00-12:00 encosta no fim mas nao sobrepoe -> nao deve levantar
        _check_confirmed_conflict(db, "D005", datetime(2030, 7, 1, 11, 0), datetime(2030, 7, 1, 12, 0))
    finally:
        db.close()


def test_unitario_conflito_confirmado_ignora_exclude_id():
    rid = _insert_reservation("11111111111", "D005", "2030-07-01T09:00:00", "2030-07-01T11:00:00", ReservationStatus.confirmed)
    db = SessionTest()
    try:
        # mesma sobreposicao, mas excluindo a propria reserva -> sem conflito
        _check_confirmed_conflict(db, "D005", datetime(2030, 7, 1, 9, 0), datetime(2030, 7, 1, 11, 0), exclude_id=rid)
    finally:
        db.close()


# ── Unitarios: restricao de 1 reserva por usuario/horario (RN-01) ─────────────

def test_unitario_conflito_usuario_bloqueia_mesmo_usuario():
    _insert_reservation("22222222222", "D005", "2030-07-02T08:00:00", "2030-07-02T10:00:00", ReservationStatus.pending)
    db = SessionTest()
    try:
        with pytest.raises(HTTPException) as exc:
            _check_user_conflict(db, "22222222222", datetime(2030, 7, 2, 9, 0), datetime(2030, 7, 2, 11, 0))
        assert exc.value.status_code == 400
        assert exc.value.detail == Msg.USER_TIME_CONFLICT
    finally:
        db.close()


def test_unitario_conflito_usuario_permite_outro_usuario():
    _insert_reservation("22222222222", "D005", "2030-07-02T08:00:00", "2030-07-02T10:00:00", ReservationStatus.pending)
    db = SessionTest()
    try:
        # outro CPF, mesmo horario -> coexiste (RN: duas pendentes de usuarios diferentes)
        _check_user_conflict(db, "33333333333", datetime(2030, 7, 2, 8, 0), datetime(2030, 7, 2, 10, 0))
    finally:
        db.close()


# ── Unitarios: existencia da sala e bloqueio por manutencao (RN-04) ───────────

def test_unitario_sala_inexistente_levanta_404():
    db = SessionTest()
    try:
        with pytest.raises(HTTPException) as exc:
            _check_room_exists_and_available(db, "NAO_EXISTE", datetime(2030, 7, 3, 8, 0), datetime(2030, 7, 3, 10, 0))
        assert exc.value.status_code == 404
        assert exc.value.detail == Msg.ROOM_NOT_FOUND
    finally:
        db.close()


def test_unitario_sala_existente_sem_manutencao_ok():
    db = SessionTest()
    try:
        # D005 e criada pelo fixture clean_database sem manutencao -> nao deve levantar
        _check_room_exists_and_available(db, "D005", datetime(2030, 7, 3, 8, 0), datetime(2030, 7, 3, 10, 0))
    finally:
        db.close()


def test_unitario_sala_com_manutencao_confirmada_bloqueia():
    db = SessionTest()
    db.add(User(nome="Doc Manut", cpf="44444444444", status=True, senha="x", tipo=UserRole.DOCENTE))
    db.commit()
    db.add(MaintenanceRequest(
        teacher_cpf="44444444444",
        teacher_name="Doc Manut",
        room="D005",
        description="manutencao",
        status=MaintenanceStatus.confirmed,
        start_date=date(2030, 7, 3),
        end_date=date(2030, 7, 3),
    ))
    db.commit()
    try:
        with pytest.raises(HTTPException) as exc:
            _check_room_exists_and_available(db, "D005", datetime(2030, 7, 3, 8, 0), datetime(2030, 7, 3, 10, 0))
        assert exc.value.status_code == 400
        assert exc.value.detail == Msg.ROOM_UNDER_MAINTENANCE
    finally:
        db.close()
 