Feature: Room CRUD E2E

@salas
Scenario: Criar Sala
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And a sala de nome "D005" não aparece na lista de salas cadastradas
When eu seleciono a opção "cadastrar sala"
And tento cadastrar a sala "D005" com capacidade "80", descrição com "sala de reunião", número de computadores "40" e status de manutenção "Não"
Then o sistema processa a requisição de cadastro
And eu vejo uma mensagem de confirmação de cadastro de sala
And o sistema salva a sala no banco
And eu ainda estou na tela de salas cadastradas
And a sala "D005" aparece na lista de salas cadastradas

@salas
Scenario: Remover Sala
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And eu vejo a sala "D005" na lista de salas cadastradas
When eu seleciono a opção "remover sala" da sala "D005"
And confirmo que realmente quero remover a sala "D005"
Then o sistema processa a requisição de deleção
And eu vejo uma mensagem de confirmação de remoção de sala
And a sala não está mais no banco
And eu ainda estou na tela de salas cadastradas
And eu não vejo a sala "D005" na lista de salas cadastradas

@salas
Scenario: Editar Sala
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And eu vejo a sala "D005" na lista de salas cadastradas com capacidade "80"
When eu seleciono a opção "editar sala" da sala "D005"
And edito a capacidade "80" para "60"
And salvo as alterações
Then o sistema processa a requisição de edição
And eu recebo uma mensagem de confirmação de edição
And o banco atualiza a capacidade da sala "D005" para "60"
And eu ainda estou na tela de salas cadastradas
And a sala "D005" aparece com capacidade "60" na lista de salas cadastradas

@salas
Scenario: Tentar criar sala duplicada
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And eu vejo a sala "D005" na lista de salas cadastradas
When eu seleciono a opção "cadastrar sala"
And tento cadastrar a sala "D005" com capacidade "80", descrição com "sala de reunião", número de computadores "30" e status de manutenção "Não"
Then o sistema retorna erro para a requisição de cadastro
And a sala "D005" continua no banco sem duplicata
And eu recebo uma mensagem de erro informando que a sala "D005" já existe
And eu continuo na tela com o formulário de cadastro de sala
And a tela do formulário de cadastro está com todos os campos vazios

@salas
Scenario: Remover Sala Reservada
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And eu vejo a sala "D005" na lista de salas cadastradas
And eu vejo que a sala "D005" está reservada
When eu seleciono a opção "remover sala" da sala "D005"
And confirmo que realmente quero remover a sala "D005"
Then o sistema retorna erro para a requisição de deleção
And a sala "D005" continua no banco
And eu vejo uma mensagem de erro informando que não posso remover uma sala reservada
And eu ainda estou na tela de salas cadastradas
And eu continuo vendo a sala "D005" na lista de salas cadastradas

@salas
Scenario: Tentar Editar Sala Reservada
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
And eu vejo a sala "D005" na lista de salas cadastradas com capacidade "80" e com status "reservada"
When eu seleciono a opção "editar sala" da sala "D005"
And edito a capacidade "80" para "60"
And salvo as alterações
Then o sistema retorna erro para a requisição de edição
And a sala "D005" continua no banco com capacidade "80"
And eu recebo uma mensagem de erro informando que não é possível editar uma sala reservada
And eu ainda estou na tela de salas cadastradas
And a sala "D005" ainda aparece com capacidade "80" na lista de salas cadastradas e com status "reservada"

@salas
Scenario: Buscar sala existente
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
When eu faço uma busca pela sala "D005"
Then eu vejo apenas a sala "D005" na lista de salas cadastradas

@salas
Scenario: Listar salas reservadas
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
When eu filtro por salas "reservadas"
Then eu vejo apenas as salas com o status "Reservada" na lista de salas cadastradas

@salas
Scenario: Listar salas em manutenção
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
When eu filtro por salas "Em manutenção"
Then eu vejo apenas as salas com o status "Em manutenção" na lista de salas cadastradas

@salas
Scenario: Listar salas disponíveis
Given eu estou logado como administrador com o usuário "Maria" com CPF "35977425058"
And eu estou na tela de salas cadastradas
When eu filtro por salas "Disponíveis"
Then eu vejo apenas as salas com o status "Disponível" na lista de salas cadastradas
