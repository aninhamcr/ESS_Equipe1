@equipment
Feature: Reservar computadores de laboratório pela interface
  Como estudante matriculado
  Quero reservar computadores vinculados a uma sala
  Para garantir acesso aos equipamentos no horário desejado

  Scenario: Criar uma reserva pendente de computadores com sucesso
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "3" computadores de "2032-04-10T08:00" ate "2032-04-10T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o aviso de equipamentos "Reserva de computadores criada com sucesso"
    And vejo uma reserva de equipamentos da sala "D005" com "3" computadores e status "Pendente"

  Scenario: Falha ao reservar computadores em sala em manutenção
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And a sala de equipamentos "E101" esta em manutencao
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "E101" com "2" computadores de "2032-04-10T14:00" ate "2032-04-10T16:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "Room is under maintenance"

  Scenario: Reservar computadores como aluno diferente no mesmo horário
    Given existe uma reserva de equipamentos "pending" de "Vitoria Rocha" CPF "61622051009" na sala "D005" com "3" computadores de "2032-05-10T08:00:00" ate "2032-05-10T10:00:00"
    And estou autenticado para reservar equipamentos como "Carlos Lima" com CPF "97405315046"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "4" computadores de "2032-05-10T08:00" ate "2032-05-10T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo uma reserva de equipamentos da sala "D005" com "4" computadores e status "Pendente"

  Scenario: Falha ao criar segunda reserva do mesmo aluno no mesmo horário
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-06-10T08:00:00" ate "2032-06-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "E101" com "1" computadores de "2032-06-10T09:00" ate "2032-06-10T11:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "You already have a reservation at this time"

  Scenario: Falha ao reservar quantidade acima dos computadores disponíveis
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    When preencho a reserva de equipamentos na sala "D005" com "11" computadores de "2032-06-15T08:00" ate "2032-06-15T10:00"
    And confirmo a nova reserva de equipamentos
    Then vejo o erro de equipamentos "Only 10 computers are available"
    And nao vejo reserva de equipamentos da sala "D005"

  Scenario: Editar uma reserva pendente com sucesso
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-07-10T08:00:00" ate "2032-07-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When edito a reserva de equipamentos da sala "D005"
    And altero a quantidade reservada para "4"
    And salvo a reserva de equipamentos
    Then vejo uma reserva de equipamentos da sala "D005" com "4" computadores e status "Pendente"

  Scenario: Cancelar uma reserva pendente com sucesso
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-08-10T08:00:00" ate "2032-08-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    When cancelo a reserva de equipamentos da sala "D005"
    And confirmo o cancelamento da reserva de equipamentos
    Then vejo o aviso de equipamentos "Reserva de computadores cancelada com sucesso"
    And nao vejo reserva de equipamentos da sala "D005"

  Scenario: Tentativa de editar ou cancelar uma reserva confirmada
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "confirmed" na sala "E101" com "2" computadores de "2032-09-10T08:00:00" ate "2032-09-10T10:00:00"
    And estou na pagina de reservas de equipamentos
    Then vejo uma reserva de equipamentos da sala "E101" com "2" computadores e status "Confirmada"
    And a reserva de equipamentos da sala "E101" nao possui a acao "Editar"
    And a reserva de equipamentos da sala "E101" nao possui a acao "Cancelar"

  Scenario: Campos obrigatórios da reserva exibidos corretamente
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And estou na pagina de reservas de equipamentos
    Then vejo o campo para selecionar a sala de equipamentos
    And vejo o campo para informar a quantidade de computadores
    And vejo os campos de inicio e fim da reserva de equipamentos
    And vejo o botao para confirmar a reserva de equipamentos

  Scenario: Filtrar visualmente as reservas por status
    Given estou autenticado para reservar equipamentos como "Vitoria Rocha" com CPF "61622051009"
    And possuo uma reserva de equipamentos "pending" na sala "D005" com "2" computadores de "2032-11-10T08:00:00" ate "2032-11-10T10:00:00"
    And possuo uma reserva de equipamentos "confirmed" na sala "E101" com "3" computadores de "2032-11-11T14:00:00" ate "2032-11-11T16:00:00"
    And estou na pagina de reservas de equipamentos
    When filtro as reservas de equipamentos pelo status "Confirmada"
    Then vejo uma reserva de equipamentos da sala "E101" com "3" computadores e status "Confirmada"
    And nao vejo reserva de equipamentos da sala "D005"

  Scenario: Dados internos da nova reserva montados corretamente
    Then os métodos internos montam corretamente o payload da reserva

  Scenario: Listagem e edição processadas corretamente pelos métodos internos
    Then os métodos internos filtram formatam e identificam alterações
