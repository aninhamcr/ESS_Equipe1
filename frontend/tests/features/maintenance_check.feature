@maintenance_check
Feature: Confirmação e Negação de Solicitações de Manutenção
  As um administrador do sistema
  I want to confirmar ou negar solicitações de manutenção de salas
  So that eu possa gerenciar adequadamente o estado e a disponibilidade das salas

  Scenario: Visualizar solicitações de manutenção pendentes
    Given eu estou logado como administrador
    When eu acesso a página de visualização de solicitações de manutenção
    Then eu consigo visualizar as solicitações

  Scenario: Confirmar solicitação de manutenção com sucesso
    Given eu estou logado como administrador
    And existe uma solicitação de manutenção pendente para a sala "D005" sem reservas confirmadas
    When eu seleciono a opção de confirmar a solicitação da sala "D005"
    And eu preencho a data de fim da manutenção com "2026-08-26"
    And eu clico no botão de confirmação de manutenção
    Then o status da solicitação da sala "D005" é atualizado para "Confirmada"

  Scenario: Negar solicitação de manutenção
    Given eu estou logado como administrador
    And existe uma solicitação de manutenção pendente para a sala "E101" sem reservas confirmadas
    When eu seleciono a opção de negar a solicitação da sala "E101"
    Then o status da solicitação da sala "E101" é atualizado para "Negada"
    And a sala "E101" permanece disponível para reservas

  Scenario: Confirmar manutenção e negar reservas pendentes automaticamente
    Given eu estou logado como administrador
    And existe uma solicitação de manutenção pendente para a sala "D005" sem reservas confirmadas
    And a sala "D005" possui reservas com status "pending" dentro do período "2026-06-09" a "2026-07-02"
    When eu seleciono a opção de confirmar a solicitação da sala "D005"
    And eu preencho a data de fim da manutenção com "2026-07-02"
    And eu clico no botão de confirmação de manutenção
    Then o sistema exibe o aviso de reservas pendentes
    When eu confirmo a manutenção mesmo assim
    Then o status da solicitação da sala "D005" é atualizado para "Confirmada"

  Scenario: Impedir confirmação de manutenção com reservas confirmadas no período
    Given eu estou logado como administrador
    And existe uma solicitação de manutenção pendente para a sala "E101" sem reservas confirmadas
    And a sala "E101" possui reservas com status "confirmed" dentro do período "2026-06-09" a "2026-07-19"
    When eu seleciono a opção de confirmar a solicitação da sala "E101"
    And eu preencho a data de fim da manutenção com "2026-07-19"
    And eu clico no botão de confirmação de manutenção
    Then eu vejo a mensagem de bloqueio "Não é possível confirmar a manutenção. Existem reservas confirmadas para esta sala no período selecionado."
    And o status da solicitação da sala "E101" permanece "Pendente"
