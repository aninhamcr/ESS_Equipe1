import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const BASE_URL = "http://localhost:3000";
const API_URL  = "http://localhost:8000";

Before({ tags: "@listagem" }, () => {
  cy.request("DELETE", `${API_URL}/test/users`);
  cy.request("POST",   `${API_URL}/test/rooms/seed`);
});

function criarUsuario({ nome, cpf, senha, tipo }) {
  const body =
    tipo === "docente"
      ? { nome, cpf, tipo, siape: cpf, senha }
      : { nome, cpf, tipo, matricula: cpf, curso: "Computacao", senha };
  cy.request({ method: "POST", url: `${API_URL}/users/`, body, failOnStatusCode: false });
}

function autenticar(nome, cpf, senha, tipo) {
  criarUsuario({ nome, cpf, senha, tipo });
  cy.wrap({ cpf, nome, senha, tipo }).as("authUser");
}

function navegarParaListagem() {
  cy.intercept("GET", "**/api/reservations/my-reservations**").as("loadReservas");
  cy.get("@authUser").then((u) => {
    cy.visit(`${BASE_URL}/reservas-de-sala`, {
      onBeforeLoad(win) {
        win.localStorage.setItem("user", JSON.stringify(u));
      },
    });
  });
  cy.contains("Reservas de Sala", { timeout: 10000 }).should("be.visible");
  cy.wait("@loadReservas", { timeout: 15000 });
}

// ── GIVEN ─────────────────────────────────────────────────────────────────────

// "estou autenticado como discente" e "a reserva da sala X nao possui o botao Y"
// ja estao em test_reservation.js — nao redefinir aqui

Given("estou na pagina de listagem de reservas", () => navegarParaListagem());

Given(
  "possuo uma reserva com status {string} da sala {string} de {string} a {string}",
  (status, room, inicio, fim) => {
    cy.get("@authUser").then((u) => {
      cy.request({
        method: "POST",
        url: `${API_URL}/test/reservations/seed`,
        body: { user_cpf: u.cpf, user_name: u.nome, user_type: u.tipo, room, start_time: inicio, end_time: fim, status },
      });
    });
  },
);

Given("nao possuo nenhuma reserva cadastrada", () => {});

// ── WHEN ──────────────────────────────────────────────────────────────────────

When("aplico o filtro de status {string}", (statusLabel) => {
  cy.contains("button", statusLabel, { timeout: 10000 }).click();
});

When("nenhum filtro esta aplicado", () => {});

When("a listagem e carregada", () => {
  cy.contains("Reservas de Sala", { timeout: 10000 }).should("be.visible");
});

// ── THEN ──────────────────────────────────────────────────────────────────────

Then("vejo apenas reservas com status {string} na listagem", (statusLabel) => {
  cy.get("tr.reserva-row", { timeout: 10000 }).each(($tr) => {
    cy.wrap($tr).should("contain", statusLabel);
  });
});

Then("vejo na listagem uma reserva da sala {string} com status {string}", (room, statusLabel) => {
  cy.contains("tr.reserva-row", room, { timeout: 10000 }).within(() => {
    cy.get("span").invoke("text").should("include", statusLabel);
  });
});

Then("a listagem aparece vazia", () => {
  cy.get("tr.reserva-row").should("not.exist");
  cy.contains("ainda não tem reservas", { timeout: 10000 }).should("be.visible");
});

Then("as reservas aparecem ordenadas da mais recente para a mais antiga", () => {
  cy.get("tr.reserva-row", { timeout: 10000 }).then(($rows) => {
    const datas = [...$rows].map((row) =>
      row.querySelector("td:nth-child(2)")?.textContent?.trim() ?? ""
    );
    const ordenadas = [...datas].sort().reverse();
    expect(datas).to.deep.equal(ordenadas);
  });
});

Then("a reserva da sala {string} possui o botao {string}", (room, label) => {
  cy.contains("tr.reserva-row", room, { timeout: 10000 }).within(() => {
    cy.contains("button", label).should("be.visible");
  });
});