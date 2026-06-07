@usuarios
Feature: Gerenciamento de usuarios
  Como usuario do sistema Salla
  Quero me cadastrar, autenticar e gerenciar minha conta pela interface
  Para acessar o sistema de reservas de salas e equipamentos

  # ── CADASTRO ──────────────────────────────────────────────────────────────

  Scenario: Cadastro de discente realizado com sucesso
    Given eu estou na página "Cadastro"
    When eu preencho o campo "Nome" com "Luan Santana"
    And eu preencho o campo "CPF" com "61622051009"
    And eu seleciono o tipo de vínculo "Discente"
    And eu preencho o campo "Matricula" com "61622051009"
    And eu preencho o campo "Curso" com "Computacao"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Criar conta"
    Then eu sou redirecionado para a página "Login"

  Scenario: Cadastro de docente realizado com sucesso
    Given eu estou na página "Cadastro"
    When eu preencho o campo "Nome" com "Wesley Safadao"
    And eu preencho o campo "CPF" com "81081395036"
    And eu seleciono o tipo de vínculo "Docente"
    And eu preencho o campo "SIAPE" com "81081395036"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Criar conta"
    Then eu sou redirecionado para a página "Login"

  Scenario: Tentativa de cadastro com CPF ja existente
    Given existe um usuario cadastrado com CPF "61622051009"
    And eu estou na página "Cadastro"
    When eu preencho o campo "Nome" com "Outro Usuario"
    And eu preencho o campo "CPF" com "61622051009"
    And eu seleciono o tipo de vínculo "Discente"
    And eu preencho o campo "Matricula" com "20230002"
    And eu preencho o campo "Curso" com "Direito"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Criar conta"
    Then eu vejo a mensagem de erro "CPF já cadastrado"
    And eu permaneco na página "Cadastro"

  Scenario: Tentativa de cadastro de docente sem SIAPE
    Given eu estou na página "Cadastro"
    When eu preencho o campo "Nome" com "Docente Sem Siape"
    And eu preencho o campo "CPF" com "97405315046"
    And eu seleciono o tipo de vínculo "Docente"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Criar conta"
    Then o campo "SIAPE" é marcado como inválido
    And eu permaneco na página "Cadastro"

  Scenario: Tentativa de cadastro com senha muito curta
    Given eu estou na página "Cadastro"
    When eu preencho o campo "Nome" com "Senha Curta"
    And eu preencho o campo "CPF" com "97405315046"
    And eu seleciono o tipo de vínculo "Discente"
    And eu preencho o campo "Matricula" com "20230001"
    And eu preencho o campo "Curso" com "Computacao"
    And eu preencho o campo "Senha" com "abc"
    And eu clico em "Criar conta"
    Then eu vejo a mensagem de erro "Senha deve conter pelo menos 6 caracteres"
    And eu permaneco na página "Cadastro"

  # ── LOGIN ─────────────────────────────────────────────────────────────────

  Scenario: Login realizado com sucesso
    Given existe um usuario ativo com CPF "61622051009" e senha "senha123"
    And eu estou na página "Login"
    When eu preencho o campo "CPF" com "61622051009"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Entrar"
    Then eu sou redirecionado para a página "Perfil"
    And eu vejo o nome "Luan Santana" na navbar

  Scenario: Tentativa de login com senha incorreta
    Given existe um usuario ativo com CPF "61622051009" e senha "senha123"
    And eu estou na página "Login"
    When eu preencho o campo "CPF" com "61622051009"
    And eu preencho o campo "Senha" com "senhaerrada"
    And eu clico em "Entrar"
    Then eu vejo a mensagem de erro "CPF ou senha inválidos"
    And eu permaneco na página "Login"

  Scenario: Tentativa de login com CPF nao cadastrado
    Given eu estou na página "Login"
    When eu preencho o campo "CPF" com "81081395036"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Entrar"
    Then eu vejo a mensagem de erro "CPF ou senha inválidos"
    And eu permaneco na página "Login"

  Scenario: Tentativa de login com conta desativada
    Given existe um usuario desativado com CPF "61622051009" e senha "senha123"
    And eu estou na página "Login"
    When eu preencho o campo "CPF" com "61622051009"
    And eu preencho o campo "Senha" com "senha123"
    And eu clico em "Entrar"
    Then eu vejo a mensagem de erro "Conta desativada"
    And eu permaneco na página "Login"

  # ── EDICAO ────────────────────────────────────────────────────────────────

  Scenario: Alteracao de nome realizada com sucesso
    Given eu estou autenticado como "Luan Santana" com CPF "61622051009" e senha "senha123"
    And eu estou na página "Perfil"
    When eu clico em "Editar"
    And eu limpo e preencho o campo "Nome" com "Luan Santana Santos"
    And eu clico em "Salvar alterações"
    Then eu vejo a mensagem de sucesso "Dados atualizados com sucesso"
    And eu vejo o nome "Luan Santana Santos" na página "Perfil"

  Scenario: Alteracao de senha realizada com sucesso
    Given eu estou autenticado como "Luan Santana" com CPF "61622051009" e senha "senha123"
    And eu estou na página "Perfil"
    When eu clico em "Editar"
    And eu preencho o campo "Nova senha" com "novasenha456"
    And eu clico em "Salvar alterações"
    Then eu vejo a mensagem de sucesso "Dados atualizados com sucesso"
    And eu consigo fazer login com CPF "61622051009" e nova senha "novasenha456"

  Scenario: Tentativa de atualizacao com senha nova muito curta
    Given eu estou autenticado como "Luan Santana" com CPF "61622051009" e senha "senha123"
    And eu estou na página "Perfil"
    When eu clico em "Editar"
    And eu preencho o campo "Nova senha" com "abc"
    And eu clico em "Salvar alterações"
    Then eu vejo a mensagem de erro "Senha deve conter pelo menos 6 caracteres"
    And eu permaneco na página "Perfil"

  # ── DESATIVACAO ───────────────────────────────────────────────────────────

  Scenario: Desativacao de conta realizada com sucesso
    Given eu estou autenticado como "Luan Santana" com CPF "61622051009" e senha "senha123"
    And eu estou na página "Perfil"
    When eu clico em "Desativar minha conta"
    And eu clico em "Sim, desativar"
    Then eu sou redirecionado para a página "Login"
    And eu nao consigo fazer login com CPF "61622051009" e senha "senha123"

  Scenario: Cancelamento da desativacao de conta
    Given eu estou autenticado como "Wesley Safadao" com CPF "81081395036" e senha "senha123"
    And eu estou na página "Perfil"
    When eu clico em "Desativar minha conta"
    And eu clico em "Cancelar"
    Then eu permaneco na página "Perfil"
    And eu vejo o nome "Wesley Safadao" na página "Perfil"