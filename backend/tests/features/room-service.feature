Feature: Room Service - Gerenciar salas

Scenario: Rejeitar computadores negativos
Given nenhuma sala com nome "D005" está armazenada no sistema
When o sistema recebe uma requisição de cadastro de sala com nome "D005", capacidade "80", descrição "sala de reunião" e computadores "-1"
And o serviço processa a criação da sala
Then a requisição é rejeitada porque os dados são inválidos
And nenhuma sala é armazenada no sistema

Scenario: Rejeitar descrição maior que 500 caracteres
Given nenhuma sala com nome "D005" está armazenada no sistema
When o sistema recebe uma requisição de cadastro de sala com nome "D005", capacidade "80", descrição com mais de 500 caracteres e computadores "10"
And o serviço processa a criação da sala
Then a requisição é rejeitada porque os dados são inválidos
And nenhuma sala é armazenada no sistema

Scenario: Rejeitar criação de sala duplicada
Given a sala "D005" está armazenada no sistema com capacidade "80", descrição "sala de reunião" e computadores "30"
When o sistema recebe uma requisição de cadastro de sala com nome "D005", capacidade "60", descrição "sala de reunião" e computadores "40"
And o serviço processa a criação da sala
Then a requisição é rejeitada porque há um conflito com um recurso existente
And a mensagem de resposta contém "Já existe uma sala com o nome 'D005'"
And a sala "D005" armazenada continua com capacidade "80", descrição "sala de reunião" e computadores "30"

Scenario: Criar sala com dados válidos
Given nenhuma sala com nome "D005" está armazenada no sistema
When o sistema recebe uma requisição de cadastro de sala com nome "D005", capacidade "80", descrição "sala de reunião" e computadores "40"
And o sistema processa a criação da sala
Then o servidor retorna uma mensagem de sucesso
And a sala "D005" é armazenada no sistema com nome "D005" como primary key, capacidade "80", computadores "40", descrição "sala de reunião", is_reserved "false" e status de manutenção "Não"

Scenario: Rejeitar criação de sala com dados incompletos
Given nenhuma sala com nome "D005" está armazenada no sistema
When o sistema recebe uma requisição de cadastro de sala com nome "D005", descrição "sala de reunião", computadores "40" e status de manutenção "Não"
And o sistema processa a criação da sala
Then a requisição é rejeitada porque os dados são inválidos ou incompletos
And o servidor retorna uma mensagem de erro contendo validação para "capacity"
And a sala "D005" continua ausente no sistema

Scenario: Deletar sala disponível
Given a sala "D005" com is_reserved "false" está armazenada no sistema
When o sistema recebe uma requisição de deleção da sala "D005"
And o serviço processa a deleção da sala
Then o servidor retorna uma mensagem de sucesso 
And a sala com nome "D005" não existe mais no sistema

Scenario: Rejeitar deleção de sala reservada
Given a sala "D005" com is_reserved "true" está armazenada no sistema
When o sistema recebe uma requisição de deleção da sala "D005"
And o serviço processa a deleção da sala
Then o servidor retorna uma mensagem de erro sobre a impossibilidade de remover salas reservadas
And a sala "D005" continua armazenada no sistema com is_reserved "true"

Scenario: Rejeitar edição de sala reservada
Given a sala "D005" com capacidade "60" e is_reserved "true" está armazenada no sistema
When o sistema recebe uma requisição de edição da capacidade da sala "D005" para "80" 
And o serviço processa a edição da sala
Then o servidor retorna uma mensagem de erro sobre a impossibilidade de editar salas reservadas
And a sala "D005" continua armazenada no sistema com capacidade "60" e is_reserved "true"

