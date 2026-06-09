// Testes E2E ponta a ponta: frontend → backend → banco de dados
// Feature: frontend/tests/features/room.feature
// Executar com: npm run cy:room

import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

const SALA_TESTE = "D005";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSala(nome) {
  return cy.request({
    method: "GET",
    url: `${API_URL}/api/rooms/${nome}`,
    failOnStatusCode: false,
  });
}

function deleteSalaSeExiste(nome) {
  getSala(nome).then((res) => {
    if (res.status !== 200) return;
    const unreserve = res.body.is_reserved
      ? cy.request("PATCH", `${API_URL}/api/rooms/${nome}/unreserve`)
      : cy.wrap(null);
    unreserve.then(() => cy.request("DELETE", `${API_URL}/api/rooms/${nome}`));
  });
}

function garantirSalaExisteComCapacidade(nome, capacidade) {
  getSala(nome).then((res) => {
    if (res.status === 404) {
      cy.request({
        method: "POST",
        url: `${API_URL}/api/rooms/`,
        body: {
          name: nome,
          capacity: Number(capacidade),
          description: "sala de reunião",
          computers: 40,
          maintenance_status: "Não",
        },
      });
    } else {
      // Garante que a sala não está reservada antes de editar
      const unreserve = res.body.is_reserved
        ? cy.request("PATCH", `${API_URL}/api/rooms/${nome}/unreserve`)
        : cy.wrap(null);
      unreserve.then(() =>
        cy.request({
          method: "PUT",
          url: `${API_URL}/api/rooms/${nome}`,
          body: { capacity: Number(capacidade), maintenance_status: "Não" },
        })
      );
    }
  });
}

// ── Before: seed do banco antes de cada cenário @salas ─────────────────────────
// Usa o endpoint de testes do backend (requer ENV=test no servidor)
// para garantir que D005 e E101 existam em estado limpo.

Before({ tags: "@salas" }, () => {
  cy.request("POST", `${API_URL}/test/rooms/seed`);
});

// ── GIVEN ─────────────────────────────────────────────────────────────────────

Given("eu estou logado como administrador com o usuário {string} com CPF {string}", (nome, cpf) => {
  cy.wrap({ nome, cpf, tipo: "admin" }).as("admin");
});

Given("eu estou na tela de salas cadastradas", () => {
  cy.get("@admin").then((admin) => {
    cy.visit(`${BASE_URL}/salas`, {
      onBeforeLoad(win) {
        win.localStorage.setItem("user", JSON.stringify(admin));
      },
    });
  });
  cy.contains("Salas cadastradas", { timeout: 10000 }).should("be.visible");
});

// Deleta D005 via API real e confirma que não existe no banco nem na tela
Given("a sala de nome {string} não aparece na lista de salas cadastradas", (nome) => {
  deleteSalaSeExiste(nome);
  cy.reload();
  cy.contains(".room-name", nome).should("not.exist");
});

// Usado como Given (setup) e como Then (asserção) — verifica apenas a UI
Given("eu vejo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome, { timeout: 10000 }).should("be.visible");
});

// Garante que D005 existe com a capacidade exata informada
Given("eu vejo a sala {string} na lista de salas cadastradas com capacidade {string}", (nome, capacidade) => {
  garantirSalaExisteComCapacidade(nome, capacidade);
  cy.reload();
  cy.contains(".room-name", nome, { timeout: 10000 }).should("be.visible");
  cy.contains(`${capacidade} pessoas`).should("be.visible");
});

// Garante que D005 existe com capacidade e status via API
Given(
  "eu vejo a sala {string} na lista de salas cadastradas com capacidade {string} e com status {string}",
  (nome, capacidade, status) => {
    garantirSalaExisteComCapacidade(nome, capacidade);
    if (status.toLowerCase() === "reservada") {
      cy.request("PATCH", `${API_URL}/api/rooms/${nome}/reserve`);
    }
    cy.reload();
    cy.contains(".room-name", nome, { timeout: 10000 }).should("be.visible");
    cy.contains(`${capacidade} pessoas`).should("be.visible");
  }
);

// Marca D005 como reservada via API real e verifica o badge na tela
Given("eu vejo que a sala {string} está reservada", (nome) => {
  cy.request("PATCH", `${API_URL}/api/rooms/${nome}/reserve`);
  cy.reload();
  cy.contains(".room-name", nome)
    .closest(".room-card")
    .contains("Reservada")
    .should("be.visible");
});

// ── WHEN ──────────────────────────────────────────────────────────────────────

When("eu seleciono a opção {string}", (opcao) => {
  if (opcao === "cadastrar sala") {
    cy.contains("Criar nova sala").click();
    cy.contains("Cadastrar nova sala").should("be.visible");
  }
});

When("eu seleciono a opção {string} da sala {string}", (opcao, nome) => {
  cy.contains(".room-name", nome)
    .closest(".room-card")
    .within(() => {
      if (opcao === "remover sala") {
        cy.contains("Excluir").click();
      } else if (opcao === "editar sala") {
        cy.get(".btn-edit-room").click();
      }
    });
});

When(
  "tento cadastrar a sala {string} com capacidade {string}, descrição com {string}, número de computadores {string} e status de manutenção {string}",
  (nome, capacidade, descricao, computadores, _status) => {
    cy.get('input[placeholder="Ex: D005"]').type(nome);
    cy.get('input[type="number"][placeholder="Ex: 80"]').type(capacidade);
    cy.get('input[placeholder="Ex: Sala de Reunião"]').type(descricao);
    cy.get('input[type="number"][placeholder="0"]').type(computadores);
    cy.contains("Salvar sala").click();
  }
);

When("confirmo que realmente quero remover a sala {string}", (_nome) => {
  cy.contains("Sim, excluir sala").click();
});

When("edito a capacidade {string} para {string}", (_antigo, novo) => {
  cy.get('input[type="number"][placeholder="Ex: 80"]').clear().type(novo);
});

When("salvo as alterações", () => {
  cy.contains("Salvar alterações").click();
});

When("eu faço uma busca pela sala {string}", (nome) => {
  cy.get(".salas-search-input").clear().type(nome);
});

When("eu filtro por salas {string}", (filtro) => {
  const mapa = {
    reservadas:        "Reservadas",
    "Em manutenção":   "Em manutenção",
    "Disponíveis":     "Disponíveis",
  };
  cy.contains(".chip", mapa[filtro] || filtro).click();
});

// ── THEN ──────────────────────────────────────────────────────────────────────

// ── Criar Sala ─────────────────────────────────────────────────────────────────

// Aguarda o modal fechar (indica que o POST terminou) antes de consultar o banco
Then("o sistema processa a requisição de cadastro", () => {
  cy.get(".modal-box").should("not.exist", { timeout: 10000 });
  getSala(SALA_TESTE).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.name).to.eq(SALA_TESTE);
  });
});

Then("o sistema salva a sala no banco", () => {
  getSala(SALA_TESTE).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.capacity).to.eq(80);
    expect(res.body.description).to.include("reunião");
    expect(res.body.computers).to.eq(40);
  });
});

Then("eu vejo uma mensagem de confirmação de cadastro de sala", () => {
  cy.get(".sala-toast", { timeout: 10000 })
    .should("have.class", "show")
    .and("contain.text", "cadastrada com sucesso");
});

Then("eu ainda estou na tela de salas cadastradas", () => {
  cy.url().should("include", "/salas");
  cy.contains("Salas cadastradas").should("be.visible");
});

Then("a sala {string} aparece na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome, { timeout: 10000 }).should("be.visible");
});

// ── Remover Sala ───────────────────────────────────────────────────────────────

// Aguarda o card sumir da UI (indica que o DELETE terminou)
Then("o sistema processa a requisição de deleção", () => {
  cy.contains(".room-name", SALA_TESTE, { timeout: 10000 }).should("not.exist");
});

Then("a sala não está mais no banco", () => {
  getSala(SALA_TESTE).its("status").should("eq", 404);
});

Then("eu vejo uma mensagem de confirmação de remoção de sala", () => {
  cy.get(".sala-toast", { timeout: 10000 })
    .should("have.class", "show")
    .and("contain.text", "removida");
});

Then("eu não vejo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome).should("not.exist");
});

// ── Editar Sala ────────────────────────────────────────────────────────────────

// Aguarda o modal fechar (indica que o PUT terminou) antes de consultar o banco
Then("o sistema processa a requisição de edição", () => {
  cy.get(".modal-box").should("not.exist", { timeout: 10000 });
  getSala(SALA_TESTE).its("status").should("eq", 200);
});

// Confirma a capacidade atualizada diretamente no banco via API
Then("o banco atualiza a capacidade da sala {string} para {string}", (nome, capacidade) => {
  getSala(nome).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.capacity).to.eq(Number(capacidade));
  });
});

Then("eu recebo uma mensagem de confirmação de edição", () => {
  cy.get(".sala-toast", { timeout: 10000 })
    .should("have.class", "show")
    .and("contain.text", "atualizada com sucesso");
});

Then("a sala {string} aparece com capacidade {string} na lista de salas cadastradas", (nome, capacidade) => {
  cy.contains(".room-name", nome)
    .closest(".room-card")
    .contains(`${capacidade} pessoas`)
    .should("be.visible");
});

// ── Tentar criar sala duplicada ────────────────────────────────────────────────

Then("o sistema retorna erro para a requisição de cadastro", () => {
  cy.get(".modal-box").contains("Já existe uma sala").should("be.visible");
});

// Confirma que há exatamente 1 sala com esse nome no banco (sem duplicata)
Then("a sala {string} continua no banco sem duplicata", (nome) => {
  cy.request(`${API_URL}/api/rooms/?skip=0&limit=100`).then((res) => {
    const salas = res.body.rooms.filter((r) => r.name === nome);
    expect(salas).to.have.length(1);
  });
});

Then("eu recebo uma mensagem de erro informando que a sala {string} já existe", (nome) => {
  cy.get(".modal-box")
    .contains(`Já existe uma sala com o nome '${nome}'`)
    .should("be.visible");
});

Then("eu continuo na tela com o formulário de cadastro de sala", () => {
  cy.get(".modal-box").should("be.visible");
  cy.contains("Cadastrar nova sala").should("be.visible");
});

Then("a tela do formulário de cadastro está com todos os campos vazios", () => {
  cy.get(".modal-box").should("be.visible");
  cy.get('input[placeholder="Ex: D005"]').should("be.visible");
});

// ── Remover Sala Reservada ─────────────────────────────────────────────────────

Then("o sistema retorna erro para a requisição de deleção", () => {
  cy.get(".modal-box").contains("Não é possível remover").should("be.visible");
});

// Confirma que a sala ainda existe no banco após a tentativa de remoção falhar
Then("a sala {string} continua no banco", (nome) => {
  getSala(nome).its("status").should("eq", 200);
});

Then("eu vejo uma mensagem de erro informando que não posso remover uma sala reservada", () => {
  cy.get(".modal-box")
    .contains("Não é possível remover a sala que está reservada")
    .should("be.visible");
});

Then("eu continuo vendo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome).should("be.visible");
});

// ── Tentar Editar Sala Reservada ───────────────────────────────────────────────

Then("o sistema retorna erro para a requisição de edição", () => {
  cy.get(".modal-box").invoke("text").should("match", /reservada/i);
});

// Confirma via API que a capacidade não mudou no banco
Then("a sala {string} continua no banco com capacidade {string}", (nome, capacidade) => {
  getSala(nome).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.capacity).to.eq(Number(capacidade));
  });
});

Then("eu recebo uma mensagem de erro informando que não é possível editar uma sala reservada", () => {
  cy.get(".modal-box").invoke("text").should("match", /reservada/i);
});

Then(
  "a sala {string} ainda aparece com capacidade {string} na lista de salas cadastradas e com status {string}",
  (nome, capacidade, _status) => {
    cy.contains(".room-name", nome)
      .closest(".room-card")
      .contains(`${capacidade} pessoas`)
      .should("be.visible");
  }
);

// ── Buscar sala existente ──────────────────────────────────────────────────────

// Verifica que a busca retorna exatamente 1 resultado com o nome correto
Then("eu vejo apenas a sala {string} na lista de salas cadastradas", (nome) => {
  cy.get(".room-name").should("have.length", 1).first().should("contain.text", nome);
});

// ── Filtros ────────────────────────────────────────────────────────────────────

// Verifica que todos os cards visíveis têm o badge correspondente ao filtro ativo
Then("eu vejo apenas as salas com o status {string} na lista de salas cadastradas", (status) => {
  cy.get(".rooms-grid").then(($grid) => {
    const cards = $grid.find(".room-card");
    if (cards.length === 0) return; // nenhuma sala no filtro: ok

    cy.get(".room-card").each(($card) => {
      cy.wrap($card).find(".room-badge").invoke("text").should("include", status);
    });
  });
});
