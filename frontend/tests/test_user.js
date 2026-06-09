import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

const MatriculaValida = "20230001";
const SIAPEValido = "20230001";
const CursoValido = "Computacao";
const NomeGenerico = "Luan Santana";
const SenhaGenerica = "senha123";

// ── Before: limpar usuários de teste ──────────────────────────────────────────
Before({ tags: "@usuarios" }, () => {
  cy.request("DELETE", "http://localhost:8000/test/users");
});

// ── Givens ────────────────────────────────────────────────────────────────────

Given("eu estou na página {string}", (página) => {
  const rotas = {
    Cadastro: "/cadastro",
    Login: "/login",
    Perfil: "/perfil",
  };

  cy.visit(`${BASE_URL}${rotas[página]}`);
});

Given("existe um usuario do tipo {string} cadastrado com CPF {string}", (tipo, cpf) => {
  const body = {
    nome: NomeGenerico,
    cpf,
    tipo,
    senha: SenhaGenerica,
  };

    if (tipo === "discente") {
      body.matricula = MatriculaValida;
      body.curso = CursoValido;
    } else if (tipo === "docente") {
      body.siape = SIAPEValido;
    }
  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body,
    failOnStatusCode: false,
  });
});

Given("existe um usuario ativo do tipo {string} com CPF {string} e senha {string}", (tipo, cpf, senha) => {
  const body = {
    nome: NomeGenerico,
    cpf,
    tipo: tipo,
    senha,
  };

    if (tipo === "discente") {
      body.matricula = MatriculaValida;
      body.curso = CursoValido;
    } else if (tipo === "docente") {
      body.siape = SIAPEValido;
    }
  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body,
    failOnStatusCode: false,
  });
});

Given("existe um usuario desativado do tipo {string} com CPF {string} e senha {string}", (tipo, cpf, senha) => {
  const body = {
    nome: NomeGenerico,
    cpf,
    tipo: tipo,
    senha,
  };

    if (tipo === "discente") {
      body.matricula = MatriculaValida;
      body.curso = CursoValido;
    } else if (tipo === "docente") {
      body.siape = SIAPEValido;
    }
  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body,
    failOnStatusCode: false,
  }).then(() => {
    cy.request({
      method: "POST",
      url: `${API_URL}/users/login`,
      body: { cpf, senha },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 200) {
        cy.request({
          method: "PATCH",
          url: `${API_URL}/users/${res.body.id}/deactivate`,
          failOnStatusCode: false,
        });
      }
    });
  });
});

Given("eu estou autenticado como usuário do tipo {string} chamado {string} com CPF {string} e senha {string}", (tipo, nome, cpf, senha) => {
  const body = {
    nome, 
    cpf, 
    tipo, 
    senha,
  };

    if (tipo === "discente") {
      body.matricula = MatriculaValida;
      body.curso = CursoValido;
    } else if (tipo === "docente") {
      body.siape = SIAPEValido;
    }

  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body,
    failOnStatusCode: false,
  }).then(() => {
    cy.request({
      method: "POST",
      url: `${API_URL}/users/login`,
      body: { cpf, senha },
    }).then((res) => {
      window.localStorage.setItem("user", JSON.stringify(res.body));
    });
  });
});


// ── Whens — Campos ────────────────────────────────────────────────────────────

When("eu preencho o campo {string} com {string}", (campo, valor) => {
  const seletores = {
    "Nome":        'input[name="nome"], input[placeholder*="Nome"]',
    "CPF":         'input[name="cpf"], input[placeholder*="CPF"], input[placeholder*="000"]',
    "Matricula":   'input[name="matricula"], input[placeholder*="atrícula"]',
    "Curso":       'input[name="curso"], input[placeholder*="urso"]',
    "SIAPE":       'input[name="siape"], input[placeholder*="SIAPE"]',
    "Senha":       'input[type="password"]',
    "Nova senha":  'input[type="password"]',
  };
  const seletor = seletores[campo] || `input[name="${campo.toLowerCase()}"]`;
  cy.get(seletor).first().clear().type(valor);
});

When("eu limpo e preencho o campo {string} com {string}", (campo, valor) => {
  const seletor = campo === "Nome"
    ? 'input[value]'
    : `input[name="${campo.toLowerCase()}"]`;
  cy.get(seletor).first().clear().type(valor);
});


When("eu seleciono o tipo de vínculo {string}", (tipo) => {
  cy.contains("button", tipo).click();
});

When("eu clico em {string}", (label) => {
  cy.contains("button", label).click();
});

// ── Thens ─────────────────────────────────────────────────────────────────────
Then("eu sou redirecionado para a página {string}", (página) => {
  const rotas = {
    Cadastro: "/cadastro",
    Login: "/login",
    Perfil: "/perfil",
    Reservas: "/reservas-de-sala",
  };
  cy.url().should("include", rotas[página]);
});

Then("eu permaneco na página {string}", (página) => {
  const rotas = {
    Cadastro: "/cadastro",
    Login: "/login",
    Perfil: "/perfil",
  };
  cy.url().should("include", rotas[página]);
});

Then("o campo {string} é marcado como inválido", (campo) => {
  const seletores = {
    Nome: "nome",
    CPF: "cpf",
    SIAPE: "siape",
    Matricula: "matricula",
    Curso: "curso",
    Senha: "senha",
  };

  cy.get(`input[name="${seletores[campo]}"]`).then(($input) => {
    expect($input[0].checkValidity()).to.be.false;
  });
});

Then("eu vejo a mensagem de erro {string}", (mensagem) => {
  cy.contains("p", mensagem).should("be.visible");
});

Then("eu vejo a mensagem de sucesso {string}", (mensagem) => {
  cy.contains(mensagem).should("be.visible");
});

Then("eu vejo o nome {string} na navbar", (nome) => {
  const primeiroNome = nome.split(" ")[0];
  cy.get("header").contains(primeiroNome).should("exist");
});

Then("eu vejo o nome {string} na página {string}", (nome, página) => {
  const rotas = {
    Cadastro: "/cadastro",
    Login: "/login",
    Perfil: "/perfil",
  };
  cy.contains(nome).should("exist");
});



Then("eu consigo fazer login com CPF {string} e nova senha {string}", (cpf, senha) => {
  cy.request({
    method: "POST",
    url: `${API_URL}/users/login`,
    body: { cpf, senha },
  }).then((res) => {
    expect(res.status).to.eq(200);
  });
});

Then("eu nao consigo fazer login com CPF {string} e senha {string}", (cpf, senha) => {
  cy.request({
    method: "POST",
    url: `${API_URL}/users/login`,
    body: { cpf, senha },
    failOnStatusCode: false,
  }).then((res) => {
    expect(res.status).to.eq(403);
  });
});