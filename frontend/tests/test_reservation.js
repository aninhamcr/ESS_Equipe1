import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

// CPF de "outro usuario" usado em cenarios de conflito (esta na lista de CPFs
// de teste permitidos do backend, entao e limpo junto com os demais).
const CPF_OUTRO = "97405315046";

// ── Before: limpar manutencoes/reservas/usuarios e garantir salas ─────────────
// Ordem importa: manutencao primeiro (FK teacher_cpf -> users.cpf), depois users.
Before({ tags: "@reservas" }, () => {
  cy.request("DELETE", `${API_URL}/test/maintenance`);
  cy.request("DELETE", `${API_URL}/test/users`);
  cy.request("POST", `${API_URL}/test/rooms/seed`);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function criarUsuario({ nome, cpf, senha, tipo }) {
  const body =
    tipo === "docente"
      ? { nome, cpf, tipo, siape: cpf, senha }
      : { nome, cpf, tipo, matricula: cpf, curso: "Computacao", senha };

  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body,
    failOnStatusCode: false,
  });
}

function autenticar(nome, cpf, senha, tipo) {
  criarUsuario({ nome, cpf, senha, tipo });
  // O AuthContext le `user` do localStorage e a pagina de reservas usa
  // cpf/nome/senha como cabecalhos X-User-*; por isso guardamos a senha.
  cy.wrap({ cpf, nome, senha, tipo }).as("authUser");
}

// ── Givens ──────────────────────────────────────────────────────────────────

Given(
  "estou autenticado como discente {string} com CPF {string} e senha {string}",
  (nome, cpf, senha) => autenticar(nome, cpf, senha, "discente"),
);

Given(
  "estou autenticado como docente {string} com CPF {string} e senha {string}",
  (nome, cpf, senha) => autenticar(nome, cpf, senha, "docente"),
);

Given("estou na pagina de reservas de sala", () => {
  cy.get("@authUser").then((u) => {
    cy.visit(`${BASE_URL}/reservas-de-sala`, {
      onBeforeLoad(win) {
        win.localStorage.setItem("user", JSON.stringify(u));
      },
    });
  });
  cy.contains("Reservas de Sala", { timeout: 10000 }).should("be.visible");
});

Given(
  "possuo uma reserva {string} da sala {string} de {string} a {string}",
  (status, room, inicio, fim) => {
    cy.get("@authUser").then((u) => {
      cy.request({
        method: "POST",
        url: `${API_URL}/test/reservations/seed`,
        body: {
          user_cpf: u.cpf,
          user_name: u.nome,
          user_type: u.tipo,
          room,
          start_time: inicio,
          end_time: fim,
          status,
        },
      });
    });
  },
);

Given(
  "o sistema possui uma reserva {string} de outro usuario da sala {string} de {string} a {string}",
  (status, room, inicio, fim) => {
    cy.request({
      method: "POST",
      url: `${API_URL}/test/reservations/seed`,
      body: {
        user_cpf: CPF_OUTRO,
        user_name: "Draco Malfoy",
        user_type: "discente",
        room,
        start_time: inicio,
        end_time: fim,
        status,
      },
    });
  },
);

Given(
  "a sala {string} esta em manutencao de {string} a {string}",
  (room, inicio, fim) => {
    cy.request({
      method: "POST",
      url: `${API_URL}/test/maintenance/seed`,
      body: { room, start_date: inicio, end_date: fim },
    });
  },
);

// ── Whens ───────────────────────────────────────────────────────────────────

When(
  "eu preencho a nova reserva com sala {string} inicio {string} e fim {string}",
  (room, inicio, fim) => {
    // Aguarda a opcao especifica carregar (as salas vem de /api/rooms async).
    cy.get("#nova-room", { timeout: 10000 }).find("option").contains(room).should("exist");
    cy.get("#nova-room").select(room);
    cy.get("#nova-start").clear().type(inicio);
    cy.get("#nova-end").clear().type(fim);
  },
);

When("eu clico em {string} na reserva da sala {string}", (label, room) => {
  cy.contains("tr", room, { timeout: 10000 })
    .within(() => cy.contains("button", label).click());
});

When("eu altero a sala para {string}", (room) => {
  cy.get("#edit-room", { timeout: 10000 }).find("option").contains(room).should("exist");
  cy.get("#edit-room").select(room);
});

// ── Thens ───────────────────────────────────────────────────────────────────

Then(
  "eu vejo na lista uma reserva da sala {string} com status {string}",
  (room, statusLabel) => {
    cy.contains("tr", room, { timeout: 10000 }).should("contain", statusLabel);
  },
);

// Versao robusta da mensagem de erro: procura em qualquer elemento (a mensagem
// de validacao 422 e renderizada num <p>, mas evitamos acoplar ao seletor).
Then("eu vejo o erro de reserva {string}", (mensagem) => {
  cy.contains(mensagem, { timeout: 10000 }).should("be.visible");
});

// O toast de sucesso usa animacao (opacity 0 -> 1); checar `be.visible` e flaky.
// A presenca do texto no DOM ja comprova que a acao teve sucesso.
Then("eu vejo o aviso de sucesso {string}", (mensagem) => {
  cy.contains(mensagem, { timeout: 10000 }).should("exist");
});

Then("a reserva da sala {string} nao possui o botao {string}", (room, label) => {
  cy.contains("tr", room, { timeout: 10000 }).within(() => {
    cy.contains("button", label).should("not.exist");
  });
});
