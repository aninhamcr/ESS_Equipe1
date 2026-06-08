@reservas
Feature: Efetuar e gerenciar reservas de sala pela interface
  Como usuario discente ou docente do sistema Salla
  Quero criar, editar e cancelar minhas reservas de sala pela interface
  Para garantir acesso ao espaco no horario desejado

  # ── CRIAR RESERVA ───────────────────────────────────────────────────────────

  Scenario: Criar uma reserva de sala com sucesso (discente)
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2031-03-01T08:00" e fim "2031-03-01T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o aviso de sucesso "Reserva criada com sucesso"
    And eu vejo na lista uma reserva da sala "D005" com status "Pendente"

  Scenario: Criar uma reserva de sala com sucesso (docente)
    Given estou autenticado como docente "Albus Dumbledore" com CPF "81081395036" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "E101" inicio "2031-04-01T14:00" e fim "2031-04-01T16:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o aviso de sucesso "Reserva criada com sucesso"
    And eu vejo na lista uma reserva da sala "E101" com status "Pendente"

  Scenario: Erro ao criar reserva com conflito de horario
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And o sistema possui uma reserva "confirmed" de outro usuario da sala "D005" de "2031-03-12T08:00:00" a "2031-03-12T11:00:00"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2031-03-12T09:00" e fim "2031-03-12T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o erro de reserva "Conflito de horário"

  Scenario: Erro ao criar reserva com horario de fim antes do inicio
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2031-03-20T10:00" e fim "2031-03-20T08:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o erro de reserva "posterior"

  Scenario: Erro ao criar reserva com horario de inicio no passado
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "D005" inicio "2020-01-01T08:00" e fim "2020-01-01T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o erro de reserva "no passado"

  Scenario: Erro ao criar reserva quando o usuario ja possui reserva no mesmo horario
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-05-01T08:00:00" a "2031-05-01T10:00:00"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "E101" inicio "2031-05-01T08:00" e fim "2031-05-01T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o erro de reserva "já possui uma reserva"

  Scenario: Erro ao criar reserva para sala em manutencao
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And a sala "E101" esta em manutencao de "2031-06-10" a "2031-06-10"
    And estou na pagina de reservas de sala
    When eu preencho a nova reserva com sala "E101" inicio "2031-06-10T08:00" e fim "2031-06-10T10:00"
    And eu clico em "Confirmar reserva"
    Then eu vejo o erro de reserva "manutenção"

  # ── EDITAR RESERVA ──────────────────────────────────────────────────────────

  Scenario: Editar a sala de uma reserva pendente
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-03-18T14:00:00" a "2031-03-18T15:00:00"
    And estou na pagina de reservas de sala
    When eu clico em "Editar" na reserva da sala "D005"
    And eu altero a sala para "E101"
    And eu clico em "Salvar alterações"
    Then eu vejo na lista uma reserva da sala "E101" com status "Pendente"

  Scenario: Erro ao editar reserva para uma sala em manutencao
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-07-01T08:00:00" a "2031-07-01T10:00:00"
    And a sala "E101" esta em manutencao de "2031-07-01" a "2031-07-01"
    And estou na pagina de reservas de sala
    When eu clico em "Editar" na reserva da sala "D005"
    And eu altero a sala para "E101"
    And eu clico em "Salvar alterações"
    Then eu vejo o erro de reserva "manutenção"

  Scenario: Erro ao editar reserva gerando conflito com reserva confirmada
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "E101" de "2031-07-02T08:00:00" a "2031-07-02T10:00:00"
    And o sistema possui uma reserva "confirmed" de outro usuario da sala "D005" de "2031-07-02T08:00:00" a "2031-07-02T10:00:00"
    And estou na pagina de reservas de sala
    When eu clico em "Editar" na reserva da sala "E101"
    And eu altero a sala para "D005"
    And eu clico em "Salvar alterações"
    Then eu vejo o erro de reserva "Conflito de horário"

  # ── CANCELAR RESERVA ────────────────────────────────────────────────────────

  Scenario: Cancelar uma reserva pendente
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "pending" da sala "D005" de "2031-03-08T08:00:00" a "2031-03-08T10:00:00"
    And estou na pagina de reservas de sala
    When eu clico em "Cancelar" na reserva da sala "D005"
    And eu clico em "Sim, cancelar"
    Then eu vejo o aviso de sucesso "Reserva cancelada com sucesso"

  Scenario: Reserva confirmada nao pode ser editada nem cancelada
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "confirmed" da sala "E101" de "2031-03-10T08:00:00" a "2031-03-10T10:00:00"
    And estou na pagina de reservas de sala
    Then eu vejo na lista uma reserva da sala "E101" com status "Confirmada"
    And a reserva da sala "E101" nao possui o botao "Editar"
    And a reserva da sala "E101" nao possui o botao "Cancelar"

  Scenario: Reserva negada nao pode ser editada nem cancelada
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva "denied" da sala "D005" de "2031-07-03T08:00:00" a "2031-07-03T10:00:00"
    And estou na pagina de reservas de sala
    Then eu vejo na lista uma reserva da sala "D005" com status "Negada"
    And a reserva da sala "D005" nao possui o botao "Editar"
    And a reserva da sala "D005" nao possui o botao "Cancelar"
