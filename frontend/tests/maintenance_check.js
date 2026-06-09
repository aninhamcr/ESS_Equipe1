import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

const TEACHER_CPF  = "97405315046";
const TEACHER_NAME = "Docente Manutencao";

const ADMIN_CPF   = "61622051009";
const ADMIN_NAME  = "Admin Teste";
const ADMIN_SENHA = "senha123";

const CPF_RESERVA = "81081395036";

// ── Before ────────────────────────────────────────────────────────────────────

Before({ tags: "@maintenance_check" }, () => {
  cy.request({ method: "DELETE", url: `${API_URL}/test/maintenance`, failOnStatusCode: false });
  cy.request({ method: "DELETE", url: `${API_URL}/test/reservations`, failOnStatusCode: false });
  cy.request({ method: "POST", url: `${API_URL}/test/rooms/seed` });

  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body: { nome: TEACHER_NAME, cpf: TEACHER_CPF, tipo: "docente", siape: TEACHER_CPF, senha: "senha123" },
    failOnStatusCode: false,
  });

  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body: { nome: ADMIN_NAME, cpf: ADMIN_CPF, tipo: "admin", siape: ADMIN_CPF, senha: ADMIN_SENHA },
    failOnStatusCode: false,
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function criarSolicitacaoPendente(room) {
  cy.request({
    method: "POST",
    url: `${API_URL}/api/maintenance/?teacher_cpf=${TEACHER_CPF}`,
    body: { room, description: "Solicitação de manutenção de teste" },
  }).then((res) => {
    cy.wrap(res.body.id).as("maintenanceId");
  });
}

function visitarPaginaManutencoes() {
  const adminUser = { cpf: ADMIN_CPF, nome: ADMIN_NAME, tipo: "admin", senha: ADMIN_SENHA };
  cy.visit(`${BASE_URL}/manutencoes`, {
    onBeforeLoad(win) {
      win.localStorage.setItem("user", JSON.stringify(adminUser));
    },
  });
  cy.contains("button", "Pendentes", { timeout: 10000 }).should("be.visible");
}

// ── Givens ────────────────────────────────────────────────────────────────────

Given("eu estou logado como administrador", () => {
  visitarPaginaManutencoes();
});

Given(
  "existe uma solicitação de manutenção pendente para a sala {string} sem reservas confirmadas",
  (room) => {
    criarSolicitacaoPendente(room);
    visitarPaginaManutencoes();
  }
);

Given(
  "a sala {string} possui reservas com status {string} dentro do período {string} a {string}",
  (room, status, inicio, fim) => {
    cy.request({
      method: "POST",
      url: `${API_URL}/test/reservations/seed`,
      body: {
        user_cpf:  CPF_RESERVA,
        user_name: "Usuario Conflito",
        user_type: "discente",
        room,
        start_time: `${inicio}T08:00:00`,
        end_time:   `${fim}T10:00:00`,
        status,
      },
    });
  }
);

// ── Whens ─────────────────────────────────────────────────────────────────────

When("eu acesso a página de visualização de solicitações de manutenção", () => {
  visitarPaginaManutencoes();
});

When("eu seleciono a opção de confirmar a solicitação da sala {string}", (room) => {
  cy.contains("td", room, { timeout: 10000 })
    .parent("tr")
    .within(() => {
      cy.contains("button", "Confirmar").click();
    });
});

When("eu seleciono a opção de negar a solicitação da sala {string}", (room) => {
  cy.contains("td", room, { timeout: 10000 })
    .parent("tr")
    .within(() => {
      cy.contains("button", "Negar").click();
    });
  // O DenyModal abre com "Sim, negar" e "Voltar" — confirma a negação
  cy.contains("button", "Sim, negar", { timeout: 8000 }).click();
});

When("eu preencho a data de fim da manutenção com {string}", (value) => {
  cy.get("input#end-date", { timeout: 8000 }).clear().type(value);
});

When("eu clico no botão de confirmação de manutenção", () => {
  cy.contains("button", "Confirmar manutenção").click();
});

When("eu confirmo a manutenção mesmo assim", () => {
  cy.contains("button", "Sim, confirmar mesmo assim", { timeout: 8000 }).click();
});

// ── Thens ─────────────────────────────────────────────────────────────────────

Then("eu consigo visualizar as solicitações", () => {
  cy.contains("button", "Pendentes").should("be.visible");
  cy.get("table", { timeout: 10000 }).should("exist");
});

Then("o status da solicitação da sala {string} é atualizado para {string}", (room, statusLabel) => {
  // Aguarda o modal fechar: o botão "Confirmar manutenção" some do DOM
  cy.contains("button", "Confirmar manutenção", { timeout: 8000 }).should("not.exist");
  cy.contains("button[role='tab']", "Decididas").click();
  cy.contains("td", room, { timeout: 10000 })
    .parent("tr")
    .find("span")
    .should("contain", statusLabel);
});

Then("a sala {string} permanece disponível para reservas", (room) => {
  cy.request(`${API_URL}/api/rooms/${room}`).then((res) => {
    expect(res.body.maintenance_status).to.equal("Não");
  });
});

Then("o sistema exibe o aviso de reservas pendentes", () => {
  cy.contains("A sala possui reservas pendentes", { timeout: 8000 }).should("be.visible");
});

Then("eu vejo a mensagem de bloqueio {string}", (message) => {
  // Cenário 5: o backend retorna 409 de confirmed_conflict → o frontend fecha o
  // modal automaticamente (setConfirmTarget(null)) e exibe um toast de erro.
  cy.contains(message, { timeout: 8000 }).should("exist");
});

Then("o status da solicitação da sala {string} permanece {string}", (room, statusLabel) => {
  // O modal já foi fechado pelo frontend após o erro de confirmed_conflict.
  // Apenas garante que estamos na aba "Pendentes" e verifica o status.
  cy.contains("button[role='tab']", "Pendentes", { timeout: 8000 }).click();
  cy.contains("td", room, { timeout: 10000 })
    .parent("tr")
    .find("span")
    .should("contain", statusLabel);
});