@listagem
Feature: Listagem de reservas de sala pela interface
  Como usuario discente ou docente do sistema Salla
  Quero visualizar minhas reservas de sala pela interface
  Para acompanhar o status e gerenciar minhas reservas

  Scenario: Listar todas as reservas sem filtro
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva com status "pending" da sala "D005" de "2031-03-01T08:00:00" a "2031-03-01T10:00:00"
    And possuo uma reserva com status "confirmed" da sala "E101" de "2031-03-02T08:00:00" a "2031-03-02T10:00:00"
    And estou na pagina de listagem de reservas
    When nenhum filtro esta aplicado
    Then vejo na listagem uma reserva da sala "D005" com status "Pendente"
    And vejo na listagem uma reserva da sala "E101" com status "Confirmada"

  Scenario: Filtrar reservas por status Pendente
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva com status "pending" da sala "D005" de "2031-03-01T08:00:00" a "2031-03-01T10:00:00"
    And possuo uma reserva com status "confirmed" da sala "E101" de "2031-03-02T08:00:00" a "2031-03-02T10:00:00"
    And estou na pagina de listagem de reservas
    When aplico o filtro de status "Pendente"
    Then vejo apenas reservas com status "Pendente" na listagem

  Scenario: Listagem vazia quando usuario nao possui reservas
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And nao possuo nenhuma reserva cadastrada
    And estou na pagina de listagem de reservas
    When a listagem e carregada
    Then a listagem aparece vazia

  Scenario: Reservas exibidas ordenadas da mais recente para a mais antiga
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva com status "pending" da sala "D005" de "2031-03-01T08:00:00" a "2031-03-01T10:00:00"
    And possuo uma reserva com status "pending" da sala "E101" de "2031-06-01T08:00:00" a "2031-06-01T10:00:00"
    And estou na pagina de listagem de reservas
    When a listagem e carregada
    Then as reservas aparecem ordenadas da mais recente para a mais antiga

  Scenario: Reserva confirmada nao pode ser editada nem cancelada
    Given estou autenticado como discente "Harry Potter" com CPF "61622051009" e senha "senha123"
    And possuo uma reserva com status "confirmed" da sala "E101" de "2031-03-10T08:00:00" a "2031-03-10T10:00:00"
    And estou na pagina de listagem de reservas
    When a listagem e carregada
    Then vejo na listagem uma reserva da sala "E101" com status "Confirmada"
    And a reserva da sala "E101" nao possui o botao "Editar"
    And a reserva da sala "E101" nao possui o botao "Cancelar"