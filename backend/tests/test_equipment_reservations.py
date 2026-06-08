from datetime import date, datetime, timedelta, timezone
import os

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from database import Base, get_db
from models.equipment import ComputerReservation, ComputerReservationStatus
from models.maintenance import MaintenanceRequest, MaintenanceStatus
from models.reservation import Reservation, ReservationStatus
from models.room import Room, RoomMaintenanceStatus
from models.user import User, UserRole
from main import app

engine_test = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionTest = sessionmaker(bind=engine_test)

def override_get_db():
    db = SessionTest()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

scenarios("../../features/lab-equipment-reservation.feature")


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


def _parse_dt(value: str) -> datetime:
    for fmt in ("%d/%m/%Y %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Formato de data invalido: {value}")


def _insert_room(name: str, computers: int, maintenance_status: RoomMaintenanceStatus):
    db = SessionTest()
    db.add(
        Room(
            name=name,
            capacity=30,
            description="Sala de teste",
            computers=computers,
            maintenance_status=maintenance_status,
            is_reserved=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.close()


def _ensure_user(user_name: str, user_cpf: str, active: bool = True):
    db = SessionTest()
    user = db.query(User).filter(User.cpf == user_cpf).first()
    if user is None:
        db.add(
            User(
                nome=user_name,
                cpf=user_cpf,
                status=active,
                senha="test-password-hash",
                tipo=UserRole.DISCENTE,
                matricula=f"MAT-{user_cpf}",
                curso="Computacao",
            )
        )
        db.commit()
    db.close()


def _insert_reservation(
    context,
    user_name: str,
    user_cpf: str,
    room: str,
    quantity: int,
    start_time: str,
    end_time: str,
    status: ComputerReservationStatus = ComputerReservationStatus.pending,
):
    _ensure_user(user_name, user_cpf)
    db = SessionTest()
    reservation = ComputerReservation(
        user_cpf=user_cpf,
        user_name=user_name,
        room=room,
        computer_quantity=quantity,
        start_time=_parse_dt(start_time),
        end_time=_parse_dt(end_time),
        status=status,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    context["reservation_id"] = reservation.id
    db.close()


def _request_body(context):
    return {
        "room": context["body"]["room"],
        "computer_quantity": int(context["body"]["computer_quantity"]),
        "start_time": _parse_dt(context["body"]["start_time"]).isoformat(),
        "end_time": _parse_dt(context["body"]["end_time"]).isoformat(),
    }


@given(parsers.parse('the room "{room}" has {computers:d} computers and is not under maintenance'))
def room_not_under_maintenance(room, computers):
    _insert_room(room, computers, RoomMaintenanceStatus.no)


@given(parsers.parse('the room "{room}" has {computers:d} computers and is under maintenance'))
def room_under_maintenance(room, computers):
    _insert_room(room, computers, RoomMaintenanceStatus.yes)


@given(parsers.parse('student "{student}" with CPF "{cpf}" has no reservation from "{start}" to "{end}"'))
def student_has_no_reservation(context, student, cpf, start, end):
    _ensure_user(student, cpf)
    context["user_name"] = student
    context["user_cpf"] = cpf


@given(parsers.parse('student "{student}" with CPF "{cpf}" has a reservation for "{quantity}" computers in room "{room}" from "{start}" to "{end}"'))
def student_has_reservation(context, student, cpf, quantity, room, start, end):
    _insert_reservation(context, student, cpf, room, int(quantity), start, end)


@given(parsers.parse('student "{student}" with CPF "{cpf}" has a pending reservation for "{quantity}" computers in room "{room}" from "{start}" to "{end}"'))
def student_has_pending_reservation(context, student, cpf, quantity, room, start, end):
    _insert_reservation(context, student, cpf, room, int(quantity), start, end, ComputerReservationStatus.pending)


@given(parsers.parse('student "{student}" with CPF "{cpf}" has a confirmed reservation for "{quantity}" computers in room "{room}" from "{start}" to "{end}"'))
def student_has_confirmed_reservation(context, student, cpf, quantity, room, start, end):
    _insert_reservation(context, student, cpf, room, int(quantity), start, end, ComputerReservationStatus.confirmed)


@given(parsers.parse('the reservation request has room "{room}", computer quantity "{quantity}", start time "{start}", and end time "{end}"'))
def reservation_request(context, room, quantity, start, end):
    context["body"] = {
        "room": room,
        "computer_quantity": quantity,
        "start_time": start,
        "end_time": end,
    }


@given(parsers.parse('the reservation update has room "{room}", computer quantity "{quantity}", start time "{start}", and end time "{end}"'))
def reservation_update(context, room, quantity, start, end):
    reservation_request(context, room, quantity, start, end)


@when(parsers.parse('student "{student}" with CPF "{cpf}" requests a computer reservation'))
def request_reservation(client, context, student, cpf):
    _ensure_user(student, cpf)
    context["user_name"] = student
    context["user_cpf"] = cpf
    context["response"] = client.post(
        "/api/equipment/reservations/",
        params={"user_cpf": cpf, "user_name": student},
        json=_request_body(context),
    )
    if context["response"].status_code == 201:
        context["reservation_id"] = context["response"].json()["id"]


@when(parsers.parse('student with CPF "{cpf}" requests their computer reservations'))
def request_reservations(client, context, cpf):
    context["user_cpf"] = cpf
    context["response"] = client.get(
        "/api/equipment/reservations/",
        params={"user_cpf": cpf},
    )


@when(parsers.parse('student "{student}" with CPF "{cpf}" requests to update that computer reservation'))
def request_reservation_update(client, context, student, cpf):
    context["response"] = client.put(
        f"/api/equipment/reservations/{context['reservation_id']}",
        params={"user_cpf": cpf},
        json=_request_body(context),
    )


@when(parsers.parse('student "{student}" with CPF "{cpf}" requests to cancel that computer reservation'))
def request_reservation_cancellation(client, context, student, cpf):
    context["response"] = client.delete(
        f"/api/equipment/reservations/{context['reservation_id']}",
        params={"user_cpf": cpf},
    )


@then(parsers.parse('the response status should be "{status_code:d}"'))
def response_status(context, status_code):
    assert context["response"].status_code == status_code, context["response"].text


@then("the reservation request should be accepted")
def reservation_request_accepted(context):
    response_status(context, 201)


@then("the reservation request should be rejected")
def reservation_request_rejected(context):
    response_status(context, 400)


@then("the reservation list should be returned successfully")
def reservation_list_returned(context):
    response_status(context, 200)


@then("the reservation should be updated successfully")
def reservation_updated(context):
    response_status(context, 200)


@then("the update request should be rejected")
def reservation_update_rejected(context):
    response_status(context, 400)


@then("the reservation should be canceled successfully")
def reservation_canceled(context):
    response_status(context, 204)


@then("the cancellation request should be rejected")
def reservation_cancellation_rejected(context):
    response_status(context, 400)


@then(parsers.parse('the response message should be "{message}"'))
def response_message(context, message):
    assert context["response"].json()["detail"] == message


@then(parsers.parse('the reservation should be stored with status "{status}"'))
def reservation_stored_with_status(context, status):
    body = context["response"].json()
    assert body["status"] == status


@then(parsers.parse('the stored reservation should have room "{room}", computer quantity "{quantity}", start time "{start}", and end time "{end}"'))
def stored_reservation_data(context, room, quantity, start, end):
    body = context["response"].json()
    assert body["room"] == room
    assert body["computer_quantity"] == int(quantity)
    assert body["start_time"].startswith(_parse_dt(start).isoformat())
    assert body["end_time"].startswith(_parse_dt(end).isoformat())


@then(parsers.parse('no reservation should be stored for student CPF "{cpf}"'))
def no_reservation_stored(cpf):
    db = SessionTest()
    count = db.query(ComputerReservation).filter(ComputerReservation.user_cpf == cpf).count()
    db.close()
    assert count == 0


@then(parsers.parse('the reservation list should contain room "{room}", status "{status}", and computer quantity "{quantity}"'))
def list_contains_reservation(context, room, status, quantity):
    body = context["response"].json()
    assert len(body) == 1
    assert body[0]["room"] == room
    assert body[0]["status"] == status
    assert body[0]["computer_quantity"] == int(quantity)


@then("the reservation should no longer be stored")
def reservation_no_longer_stored(context):
    db = SessionTest()
    reservation = db.query(ComputerReservation).filter(ComputerReservation.id == context["reservation_id"]).first()
    db.close()
    assert reservation is None


def _create_api_reservation(
    client,
    room="Integration Lab",
    cpf="52998224725",
    name="Integration Student",
    start="2026-08-10T08:00:00",
    end="2026-08-10T10:00:00",
):
    return client.post(
        "/api/equipment/reservations/",
        params={"user_cpf": cpf, "user_name": name},
        json={
            "room": room,
            "computer_quantity": 2,
            "start_time": start,
            "end_time": end,
        },
    )


def test_create_rejects_unknown_user(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)

    response = _create_api_reservation(client)

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_create_rejects_inactive_user(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)
    _ensure_user("Integration Student", "52998224725", active=False)

    response = _create_api_reservation(client)

    assert response.status_code == 403


def test_create_rejects_user_name_mismatch(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)
    _ensure_user("Registered Name", "52998224725")

    response = _create_api_reservation(client)

    assert response.status_code == 401


def test_create_rejects_conflict_with_room_reservation(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)
    _ensure_user("Integration Student", "52998224725")
    db = SessionTest()
    db.add(
        Reservation(
            user_cpf="52998224725",
            user_name="Integration Student",
            user_type="discente",
            room="Integration Lab",
            start_time=datetime(2026, 8, 10, 9, 0),
            end_time=datetime(2026, 8, 10, 11, 0),
            status=ReservationStatus.pending,
        )
    )
    db.commit()
    db.close()

    response = _create_api_reservation(client)

    assert response.status_code == 400
    assert response.json()["detail"] == "You already have a reservation at this time"


def test_admin_can_list_confirm_and_deny_equipment_reservations(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)
    _ensure_user("Integration Student", "52998224725")
    first = _create_api_reservation(client)
    second = _create_api_reservation(
        client,
        start="2026-08-10T11:00:00",
        end="2026-08-10T13:00:00",
    )
    assert first.status_code == 201
    assert second.status_code == 201

    listed = client.get("/api/admin/equipment-reservations")
    confirmed = client.patch(
        f"/api/admin/equipment-reservations/{first.json()['id']}/confirm"
    )
    denied = client.patch(
        f"/api/admin/equipment-reservations/{second.json()['id']}/deny"
    )

    assert listed.status_code == 200
    assert len(listed.json()) == 2
    assert confirmed.status_code == 200
    assert confirmed.json()["reservation"]["status"] == "confirmed"
    assert denied.status_code == 200
    assert denied.json()["reservation"]["status"] == "denied"


def test_maintenance_detects_and_denies_pending_equipment_reservation(client):
    room = "Integration Lab"
    teacher_cpf = "11111111111"
    _insert_room(room, 10, RoomMaintenanceStatus.no)
    _ensure_user("Integration Student", "52998224725")
    db = SessionTest()
    db.add(
        User(
            nome="Professor Integration",
            cpf=teacher_cpf,
            status=True,
            senha="test-password-hash",
            tipo=UserRole.DOCENTE,
            siape="SIAPE-INTEGRATION",
        )
    )
    db.add(
        MaintenanceRequest(
            teacher_cpf=teacher_cpf,
            teacher_name="Professor Integration",
            room=room,
            description="Maintenance integration test",
            status=MaintenanceStatus.pending,
        )
    )
    db.commit()
    maintenance = db.query(MaintenanceRequest).first()
    db.close()

    start = datetime.now() + timedelta(days=2)
    created = _create_api_reservation(
        client,
        start=start.isoformat(),
        end=(start + timedelta(hours=2)).isoformat(),
    )
    assert created.status_code == 201

    warning = client.put(
        f"/api/maintenance/admin/{maintenance.id}/confirm",
        json={
            "end_date": str(date.today() + timedelta(days=5)),
            "force": False,
        },
    )
    forced = client.put(
        f"/api/maintenance/admin/{maintenance.id}/confirm",
        json={
            "end_date": str(date.today() + timedelta(days=5)),
            "force": True,
        },
    )

    assert warning.status_code == 409
    assert created.json()["id"] in warning.json()["detail"][
        "pending_equipment_reservation_ids"
    ]
    assert forced.status_code == 200
    db = SessionTest()
    reservation = db.get(ComputerReservation, created.json()["id"])
    assert reservation.status == ComputerReservationStatus.denied
    db.close()


def test_scheduler_updates_expired_equipment_reservations(monkeypatch):
    from services import reservation_scheduler

    now = datetime.now() - timedelta(hours=2)
    db = SessionTest()
    db.add_all(
        [
            ComputerReservation(
                user_cpf="52998224725",
                user_name="Pending Student",
                room="Integration Lab",
                computer_quantity=1,
                start_time=now,
                end_time=now + timedelta(hours=1),
                status=ComputerReservationStatus.pending,
            ),
            ComputerReservation(
                user_cpf="52998224726",
                user_name="Confirmed Student",
                room="Integration Lab",
                computer_quantity=1,
                start_time=now - timedelta(hours=2),
                end_time=now,
                status=ComputerReservationStatus.confirmed,
            ),
        ]
    )
    db.commit()
    ids = [reservation.id for reservation in db.query(ComputerReservation).all()]
    db.close()
    monkeypatch.setattr(reservation_scheduler, "SessionLocal", SessionTest)

    reservation_scheduler._expire_reservations()

    db = SessionTest()
    reservations = {
        reservation.id: reservation.status
        for reservation in db.query(ComputerReservation)
        .filter(ComputerReservation.id.in_(ids))
        .all()
    }
    db.close()
    assert reservations[ids[0]] == ComputerReservationStatus.denied
    assert reservations[ids[1]] == ComputerReservationStatus.completed


def test_deactivating_user_denies_equipment_reservations(client):
    _insert_room("Integration Lab", 10, RoomMaintenanceStatus.no)
    _ensure_user("Integration Student", "52998224725")
    created = _create_api_reservation(client)
    assert created.status_code == 201
    db = SessionTest()
    user = db.query(User).filter(User.cpf == "52998224725").first()
    user_id = user.id
    db.close()

    response = client.patch(f"/users/{user_id}/deactivate")

    assert response.status_code == 200
    db = SessionTest()
    reservation = db.get(ComputerReservation, created.json()["id"])
    assert reservation.status == ComputerReservationStatus.denied
    db.close()
