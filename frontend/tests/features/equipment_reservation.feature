@equipment
Feature: Reservar computadores de laboratório pela interface
  Como estudante matriculado
  Quero reservar computadores vinculados a uma sala
  Para garantir acesso aos equipamentos no horário desejado

  # Classificação semântica:
  # @gui valida elementos e comportamentos observáveis na interface.
  # @e2e percorre interface, API e banco de dados.
  # Um cenário pode pertencer às duas categorias.

  @gui @e2e
  Scenario: Criar uma reserva pendente de computadores
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "3" computadores de "2032-04-10T08:00" ate "2032-04-10T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o aviso de equipamentos "Reserva de computadores criada com sucesso"
    And vejo uma reserva de equipamentos da sala "D005" com "3" computadores e status "Pendente"

  @gui @e2e
  Scenario: Bloquear reserva quando a sala está em manutenção
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And a sala de equipamentos "E101" esta em manutencao
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "E101" com "2" computadores de "2032-04-10T14:00" ate "2032-04-10T16:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "Room is under maintenance"

  @e2e
  Scenario: Permitir alunos diferentes no mesmo horário dentro da capacidade
    Given existe uma reserva de equipamentos "pending" de "Vitoria Rocha" CPF "61622051009" na sala "D005" com "3" computadores de "2032-05-10T08:00:00" ate "2032-05-10T10:00:00"
    And estou autenticado para reservar equipamentos como "Carlos Lima" com CPF "97405315046"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "4" computadores de "2032-05-10T08:00" ate "2032-05-10T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo uma reserva de equipamentos da sala "D005" com "4" computadores e status "Pendente"

  @e2e
  Scenario: Bloquear segunda reserva do mesmo aluno no mesmo horário
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-06-10T08:00:00" ate "2032-06-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "E101" com "1" computadores de "2032-06-10T09:00" ate "2032-06-10T11:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "You already have a reservation at this time"

  @gui @e2e
  Scenario: Bloquear reserva acima da quantidade de computadores disponíveis
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "11" computadores de "2032-06-15T08:00" ate "2032-06-15T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "Only 10 computers are available"
    And nao vejo reserva de equipamentos da sala "D005"

  @gui @e2e
  Scenario: Editar uma reserva pendente
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-07-10T08:00:00" ate "2032-07-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When edito a reserva de equipamentos da sala "D005"
    And altero a quantidade reservada para "4"
    And salvo a reserva de equipamentos
    Then vejo uma reserva de equipamentos da sala "D005" com "4" computadores e status "Pendente"

  @gui @e2e
  Scenario: Cancelar uma reserva pendente
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-08-10T08:00:00" ate "2032-08-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When cancelo a reserva de equipamentos da sala "D005"
    And confirmo o cancelamento da reserva de equipamentos
    Then vejo o aviso de equipamentos "Reserva de computadores cancelada com sucesso"
    And nao vejo reserva de equipamentos da sala "D005"

  @gui
  Scenario: Reserva confirmada não pode ser editada nem cancelada
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "confirmed" na sala "E101" com "2" computadores de "2032-09-10T08:00:00" ate "2032-09-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    Then vejo uma reserva de equipamentos da sala "E101" com "2" computadores e status "Confirmada"
    And a reserva de equipamentos da sala "E101" nao possui a acao "Editar"
    And a reserva de equipamentos da sala "E101" nao possui a acao "Cancelar"

  @gui
  Scenario: Exibir os campos obrigatórios para reservar computadores
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    Then vejo o campo para selecionar a sala de equipamentos
    And vejo o campo para informar a quantidade de computadores
    And vejo os campos de inicio e fim da reserva de equipamentos
    And vejo o botao para confirmar a reserva de equipamentos

  @gui
  Scenario: Filtrar visualmente as reservas de computadores por status
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-11-10T08:00:00" ate "2032-11-10T10:00:00"
    And possuo uma reserva de equipamentos "confirmed" na sala "E101" com "3" computadores de "2032-11-11T14:00:00" ate "2032-11-11T16:00:00"
    And estou na pagina de reservas de equipamentos
    When filtro as reservas de equipamentos pelo status "Confirmada"
    Then vejo uma reserva de equipamentos da sala "E101" com "3" computadores e status "Confirmada"
    And nao vejo reserva de equipamentos da sala "D005"

  @unit
  Scenario: Montar os dados internos enviados ao criar uma reserva
    Then os métodos internos montam corretamente o payload da reserva

  @unit
  Scenario: Processar internamente a listagem e a edição de reservas
    Then os métodos internos filtram formatam e identificam alterações

  @gui @e2e @integration
  Scenario: Administrador confirma uma reserva e o aluno visualiza o novo status
    Given existe uma reserva de equipamentos "pending" de "Vitoria Rocha" CPF "61622051009" na sala "D005" com "2" computadores de "2032-10-10T08:00:00" ate "2032-10-10T10:00:00"
    When o administrador confirma a reserva de equipamentos da sala "D005"
    And estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    Then vejo uma reserva de equipamentos da sala "D005" com "2" computadores e status "Confirmada"
