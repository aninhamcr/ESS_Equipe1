@reservas
Feature: Efetuar e gerenciar reservas de sala pela interface
  Como usuario discente ou docente do sistema Salla
  Quero criar, editar e cancelar minhas reservas de sala pela interface
  Para garantir acesso ao espaco no horario desejado

  # ── CRIAR RESERVA ───────────────────────────────────────────────────────────

  Scenario: Criar uma reserva de sala com sucesso (discente)
    Given estou autenticado como discente "Ana Lima" com CPF "61622051009" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2031-03-01T08:00" e fim "2031-03-01T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo a mensagem de sucesso "Reserva criada com sucesso"
    And eu vejo na lista uma reserva da sala "D005" com status "Pendente"

  Scenario: Criar uma reserva de sala com sucesso (docente)
    Given estou autenticado como docente "Prof Silva" com CPF "81081395036" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "E101" inicio "2031-04-01T14:00" e fim "2031-04-01T16:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo a mensagem de sucesso "Reserva criada com sucesso"
    And eu vejo na lista uma reserva da sala "E101" com status "Pendente"

  Scenario: Erro ao criar reserva com conflito de horario
    Given estou autenticado como discente "Ana Lima" com CPF "61622051009" e senha "senha123"
    And o sistema possui uma reserva "confirmed" de outro usuario da sala "D005" de "2031-03-12T08:00:00" a "2031-03-12T11:00:00"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2031-03-12T09:00" e fim "2031-03-12T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo a mensagem de erro "Conflito de horário"

  # ── EDITAR RESERVA ──────────────────────────────────────────────────────────

  Scenario: Editar o horario de fim de uma reserva pendente
    Given estou autenticado como discente "Ana Lima" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-03-05T08:00:00" a "2031-03-05T10:00:00"
    And estou na pagina de reservas de sala
    When eu clico em "Editar" na reserva da sala "D005"
    And eu altero o horario de fim para "2031-03-05T11:00"
    And eu clico em "Salvar alterações"
    Then eu vejo a mensagem de sucesso "Reserva atualizada com sucesso"

  # ── CANCELAR RESERVA ────────────────────────────────────────────────────────

  Scenario: Cancelar uma reserva pendente
    Given estou autenticado como discente "Ana Lima" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-03-08T08:00:00" a "2031-03-08T10:00:00"
    And estou na pagina de reservas de sala
    When eu clico em "Cancelar" na reserva da sala "D005"
    And eu clico em "Sim, cancelar"
    Then eu vejo a mensagem de sucesso "Reserva cancelada com sucesso"

  Scenario: Reserva confirmada nao pode ser editada nem cancelada
    Given estou autenticado como discente "Ana Lima" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "confirmed" da sala "E101" de "2031-03-10T08:00:00" a "2031-03-10T10:00:00"
    And estou na pagina de reservas de sala
    Then eu vejo na lista uma reserva da sala "E101" com status "Confirmada"
    And a reserva da sala "E101" nao possui o botao "Editar"
    And a reserva da sala "E101" nao possui o botao "Cancelar"
