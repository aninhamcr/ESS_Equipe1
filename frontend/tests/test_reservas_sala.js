import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

// CPF de "outro usuario" usado em cenarios de conflito (esta na lista de CPFs
// de teste permitidos do backend, entao e limpo junto com os demais).
const CPF_OUTRO = "97405315046";

// ── Before: limpar reservas/usuarios de teste e garantir salas ────────────────
Before({ tags: "@reservas" }, () => {
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
        user_name: "Outro Usuario",
        user_type: "discente",
        room,
        start_time: inicio,
        end_time: fim,
        status,
      },
    });
  },
);

// ── Whens ───────────────────────────────────────────────────────────────────

When(
  "eu preencho a nova reserva com sala {string} inicio {string} e fim {string}",
  (room, inicio, fim) => {
    cy.get("#nova-room", { timeout: 10000 }).find("option").should("exist");
    cy.get("#nova-room").select(room);
    cy.get("#nova-start").clear().type(inicio);
    cy.get("#nova-end").clear().type(fim);
  },
);

When("eu clico em {string}", (label) => {
  cy.contains("button", label).click();
});

When("eu clico em {string} na reserva da sala {string}", (label, room) => {
  cy.contains("tr", room, { timeout: 10000 })
    .within(() => cy.contains("button", label).click());
});

When("eu altero o horario de fim para {string}", (fim) => {
  cy.get("#edit-end").clear().type(fim);
});

// ── Thens ───────────────────────────────────────────────────────────────────

Then("eu vejo a mensagem de sucesso {string}", (mensagem) => {
  cy.contains(mensagem, { timeout: 10000 }).should("be.visible");
});

Then("eu vejo a mensagem de erro {string}", (mensagem) => {
  cy.contains("p", mensagem, { timeout: 10000 }).should("be.visible");
});

Then(
  "eu vejo na lista uma reserva da sala {string} com status {string}",
  (room, statusLabel) => {
    cy.contains("tr", room, { timeout: 10000 }).should("contain", statusLabel);
  },
);

Then("a reserva da sala {string} nao possui o botao {string}", (room, label) => {
  cy.contains("tr", room, { timeout: 10000 }).within(() => {
    cy.contains("button", label).should("not.exist");
  });
});
