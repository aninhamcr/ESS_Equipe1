import pytest
from pytest_bdd import given, when, then, parsers, scenario
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from schemas.room import RoomCreate

from database import Base, get_db
import models.room  # noqa: F401
from main import app

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


@pytest.fixture(autouse=True, scope="session")
def create_tables():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(autouse=True)
def clean_database():
    app.dependency_overrides[get_db] = override_get_db
    with engine_test.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def context():
    return {}


# ==================== SCENARIOS ====================

@scenario("features/room-service.feature", "Rejeitar computadores negativos")
def test_rejeitar_computadores_negativos():
    pass


@scenario("features/room-service.feature", "Rejeitar descrição maior que 500 caracteres")
def test_rejeitar_descricao_maior_500():
    pass


@scenario("features/room-service.feature", "Rejeitar criação de sala duplicada")
def test_rejeitar_criacao_duplicada():
    pass


@scenario("features/room-service.feature", "Criar sala com dados válidos")
def test_create_room():
    pass


@scenario("features/room-service.feature", "Rejeitar criação de sala com dados incompletos")
def test_rejeitar_dados_incompletos():
    pass


@scenario("features/room-service.feature", "Deletar sala disponível")
def test_deletar_sala_disponivel():
    pass


@scenario("features/room-service.feature", "Rejeitar deleção de sala reservada")
def test_rejeitar_delecao_sala_reservada():
    pass


@scenario("features/room-service.feature", "Rejeitar edição de sala reservada")
def test_rejeitar_edicao_sala_reservada():
    pass


# ==================== GIVEN ====================

@given(parsers.parse('nenhuma sala com nome "{room_name}" está armazenada no sistema'))
def ensure_room_not_exists(context, room_name):
    context["room_name"] = room_name


@given(parsers.parse('a sala "{room_name}" está armazenada no sistema com capacidade "{capacity}", descrição "{description}" e computadores "{computers}"'))
def sala_armazenada(client, context, room_name, capacity, description, computers):
    r = client.post("/api/rooms/", json={
        "name": room_name,
        "capacity": int(capacity),
        "description": description,
        "computers": int(computers),
        "maintenance_status": "Não",
    })
    assert r.status_code == 201
    context["room_name"] = room_name


@given(parsers.parse('a sala "{room_name}" com is_reserved "false" está armazenada no sistema'))
def sala_disponivel_armazenada(client, context, room_name):
    r = client.post("/api/rooms/", json={
        "name": room_name,
        "capacity": 40,
        "description": "Sala de teste",
        "computers": 10,
        "maintenance_status": "Não",
    })
    assert r.status_code == 201
    context["room_name"] = room_name


@given(parsers.parse('a sala "{room_name}" com is_reserved "true" está armazenada no sistema'))
def sala_reservada_armazenada(client, context, room_name):
    r = client.post("/api/rooms/", json={
        "name": room_name,
        "capacity": 40,
        "description": "Sala de teste",
        "computers": 10,
        "maintenance_status": "Não",
    })
    assert r.status_code == 201
    r = client.patch(f"/api/rooms/{room_name}/reserve")
    assert r.status_code == 200
    assert r.json()["is_reserved"] is True
    context["room_name"] = room_name


@given(parsers.parse('a sala "{room_name}" com capacidade "{capacity}" e is_reserved "true" está armazenada no sistema'))
def sala_com_capacidade_reservada(client, context, room_name, capacity):
    r = client.post("/api/rooms/", json={
        "name": room_name,
        "capacity": int(capacity),
        "description": "Sala de teste",
        "computers": 10,
        "maintenance_status": "Não",
    })
    assert r.status_code == 201
    r = client.patch(f"/api/rooms/{room_name}/reserve")
    assert r.status_code == 200
    assert r.json()["is_reserved"] is True
    context["room_name"] = room_name
    context["original_capacity"] = int(capacity)


# ==================== WHEN ====================

@when(parsers.parse('o sistema recebe uma requisição de cadastro de sala com nome "{room_name}", capacidade "{capacity}", descrição "{description}" e computadores "{computers}"'))
def prepare_room_data(context, room_name, capacity, description, computers):
    context["room_data"] = {
        "name": room_name,
        "capacity": int(capacity),
        "description": description,
        "computers": int(computers),
        "maintenance_status": "Não",
    }


@when(parsers.parse('o sistema recebe uma requisição de cadastro de sala com nome "{room_name}", capacidade "{capacity}", descrição com mais de 500 caracteres e computadores "{computers}"'))
def prepare_room_data_long_description(context, room_name, capacity, computers):
    context["room_data"] = {
        "name": room_name,
        "capacity": int(capacity),
        "description": "A" * 501,
        "computers": int(computers),
        "maintenance_status": "Não",
    }


@when(parsers.parse('o sistema recebe uma requisição de cadastro de sala com nome "{room_name}", descrição "{description}", computadores "{computers}" e status de manutenção "{maintenance}"'))
def prepare_room_data_incomplete(context, room_name, description, computers, maintenance):
    context["room_data"] = {
        "name": room_name,
        "description": description,
        "computers": int(computers),
        "maintenance_status": maintenance,
    }


@when('o serviço processa a criação da sala')
@then('o serviço processa a criação da sala')
def servico_processa_criacao(client, context):
    context["response"] = client.post("/api/rooms/", json=context["room_data"])


@when('o sistema processa a criação da sala')
def sistema_processa_criacao(client, context):
    context["response"] = client.post("/api/rooms/", json=context["room_data"])


@when(parsers.parse('o sistema recebe uma requisição de deleção da sala "{room_name}"'))
def prepare_delete_room(context, room_name):
    context["room_name"] = room_name


@when('o serviço processa a deleção da sala')
def processar_delecao(client, context):
    context["response"] = client.delete(f"/api/rooms/{context['room_name']}")


@when(parsers.parse('o sistema recebe uma requisição de edição da capacidade da sala "{room_name}" para "{new_capacity}"'))
def prepare_edit_room(context, room_name, new_capacity):
    context["edit_data"] = {"capacity": int(new_capacity)}


@when('o serviço processa a edição da sala')
def processar_edicao(client, context):
    context["response"] = client.put(f"/api/rooms/{context['room_name']}", json=context["edit_data"])


# ==================== THEN ====================

@then('o servidor retorna uma mensagem de sucesso')
def check_success_response(context):
    assert context["response"].status_code in (200, 201, 204)


@then('a requisição é rejeitada porque os dados são inválidos')
def check_invalid_data(context):
    assert context["response"].status_code == 422


@then('nenhuma sala é armazenada no sistema')
def check_no_rooms(client):
    r = client.get("/api/rooms/")
    assert r.json().get("rooms", []) == []


@then('a requisição é rejeitada porque há um conflito com um recurso existente')
def check_conflict(context):
    assert context["response"].status_code == 409


@then(parsers.parse('a mensagem de resposta contém "{message}"'))
def check_message_contains(context, message):
    assert message in context["response"].json().get("detail", "")


@then(parsers.parse('a sala "{room_name}" armazenada continua com capacidade "{capacity}", descrição "{description}" e computadores "{computers}"'))
def check_room_unchanged(client, room_name, capacity, description, computers):
    r = client.get(f"/api/rooms/{room_name}")
    assert r.status_code == 200
    data = r.json()
    assert data["capacity"] == int(capacity)
    assert data["description"] == description
    assert data["computers"] == int(computers)


@then(parsers.parse('a sala "{room_name}" é armazenada no sistema com nome "{room_name}" como primary key, capacidade "{capacity}", computadores "{computers}", descrição "{description}", is_reserved "{is_reserved}" e status de manutenção "{maintenance}"'))
def check_room_stored(context, room_name, capacity, computers, description, is_reserved, maintenance):
    data = context["response"].json()
    assert data["name"] == room_name
    assert data["capacity"] == int(capacity)
    assert data["computers"] == int(computers)
    assert data["description"] == description
    assert data["is_reserved"] == (is_reserved.lower() == "true")
    assert data["maintenance_status"] == maintenance


@then('a requisição é rejeitada porque os dados são inválidos ou incompletos')
def check_invalid_or_incomplete(context):
    assert context["response"].status_code == 422


@then(parsers.parse('o servidor retorna uma mensagem de erro contendo validação para "{field}"'))
def check_validation_error_field(context, field):
    detail = context["response"].json().get("detail", [])
    assert any(field in str(e) for e in detail)


@then(parsers.parse('a sala "{room_name}" continua ausente no sistema'))
def check_room_absent(client, room_name):
    r = client.get(f"/api/rooms/{room_name}")
    assert r.status_code == 404


@then(parsers.parse('a sala com nome "{room_name}" não existe mais no sistema'))
def check_room_deleted(client, room_name):
    r = client.get(f"/api/rooms/{room_name}")
    assert r.status_code == 404


@then('o servidor retorna uma mensagem de erro sobre a impossibilidade de remover salas reservadas')
def check_cannot_delete_reserved(context):
    assert context["response"].status_code == 400
    assert "reservad" in context["response"].json().get("detail", "").lower()


@then(parsers.parse('a sala "{room_name}" continua armazenada no sistema com is_reserved "true"'))
def check_room_still_reserved(client, room_name):
    r = client.get(f"/api/rooms/{room_name}")
    assert r.status_code == 200
    assert r.json()["is_reserved"] is True


@then('o servidor retorna uma mensagem de erro sobre a impossibilidade de editar salas reservadas')
def check_cannot_edit_reserved(context):
    assert context["response"].status_code == 400
    assert "reservad" in context["response"].json().get("detail", "").lower()


@then(parsers.parse('a sala "{room_name}" continua armazenada no sistema com capacidade "{capacity}" e is_reserved "true"'))
def check_room_capacity_unchanged(client, room_name, capacity):
    r = client.get(f"/api/rooms/{room_name}")
    assert r.status_code == 200
    data = r.json()
    assert data["capacity"] == int(capacity)
    assert data["is_reserved"] is True


# ==================== UNIT TEST ====================

def test_room_create_valid_data():
    room_data = {
        "name": "D005",
        "capacity": 80,
        "description": "sala de reunião",
        "computers": 40,
        "maintenance_status": "Não",
    }
    room = RoomCreate(**room_data)
    assert room.name == "D005"
    assert room.capacity == 80
    assert room.description == "sala de reunião"
    assert room.computers == 40
    assert room.maintenance_status == "Não"
