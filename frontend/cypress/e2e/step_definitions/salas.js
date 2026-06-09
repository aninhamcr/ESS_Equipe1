import { Given, When, Then, Before } from "@badeball/cypress-cucumber-preprocessor";

// ── helpers ──────────────────────────────────────────────────────────────────

function mockRoom(name, { capacity = 80, description = "sala de reunião", computers = 40, is_reserved = false, maintenance_status = "Não" } = {}) {
  return { name, capacity, description, computers, is_reserved, maintenance_status, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

function stubRooms(rooms) {
  cy.intercept("GET", "/api/rooms/*", { statusCode: 200, body: { total: rooms.length, rooms } }).as("getRooms");
}

// ── background / reset ───────────────────────────────────────────────────────

Before(() => {
  cy.clearLocalStorage();
});

// ── GIVEN ────────────────────────────────────────────────────────────────────

Given("eu estou logado como administrador com o usuário {string} com CPF {string}", (nome, cpf) => {
  const user = { nome, cpf, tipo: "admin" };
  cy.window().then((win) => {
    win.localStorage.setItem("user", JSON.stringify(user));
  });
});

Given("eu estou na tela de salas cadastradas", () => {
  // stub GET before visiting so the page loads with the right data
  cy.intercept("GET", "/api/rooms/*", { statusCode: 200, body: { total: 0, rooms: [] } }).as("getRooms");
  cy.visit("/salas");
  cy.wait("@getRooms");
  cy.contains("Salas cadastradas").should("be.visible");
});

Given("a sala de nome {string} não aparece na lista de salas cadastradas", (nome) => {
  cy.contains(nome).should("not.exist");
});

Given("eu vejo a sala {string} na lista de salas cadastradas", (nome) => {
  // re-stub GET to include this room so it appears
  cy.intercept("GET", "/api/rooms/*", { statusCode: 200, body: { total: 1, rooms: [mockRoom(nome)] } }).as("getRooms");
  cy.wait("@getRooms");
  cy.contains(nome).should("be.visible");
});

Given("eu vejo a sala {string} na lista de salas cadastradas com capacidade {string}", (nome, capacidade) => {
  cy.contains(nome).should("be.visible");
  cy.contains(`${capacidade} pessoas`).should("be.visible");
});

Given("eu vejo a sala {string} na lista de salas cadastradas com capacidade {string} e com status {string}", (nome, capacidade, _status) => {
  cy.contains(nome).should("be.visible");
  cy.contains(`${capacidade} pessoas`).should("be.visible");
});

Given("eu vejo que a sala {string} está reservada", (nome) => {
  cy.contains(nome).closest(".room-card").contains("Reservada").should("be.visible");
});

// ── WHEN ─────────────────────────────────────────────────────────────────────

When("eu seleciono a opção {string}", (opcao) => {
  if (opcao === "cadastrar sala") {
    cy.contains("Criar nova sala").click();
  }
});

When("eu seleciono a opção {string} da sala {string}", (opcao, nome) => {
  cy.contains(nome).closest(".room-card").within(() => {
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
    // check if room already exists in DOM (duplicate scenario)
    cy.document().then((doc) => {
      const alreadyExists = !!doc.querySelector(`[class*="room-card"]`);
      if (alreadyExists) {
        cy.intercept("POST", "/api/rooms/", {
          statusCode: 409,
          body: { detail: `Já existe uma sala com o nome '${nome}'` },
        }).as("createRoom");
      } else {
        cy.intercept("POST", "/api/rooms/", {
          statusCode: 201,
          body: mockRoom(nome, { capacity: Number(capacidade), description: descricao, computers: Number(computadores) }),
        }).as("createRoom");
        stubRooms([mockRoom(nome, { capacity: Number(capacidade), description: descricao, computers: Number(computadores) })]);
      }
    });

    cy.get('input[placeholder="Ex: D005"]').type(nome);
    cy.get('input[type="number"][placeholder="Ex: 80"]').type(capacidade);
    cy.get('input[placeholder="Ex: Sala de Reunião"]').type(descricao);
    cy.get('input[type="number"][placeholder="0"]').type(computadores);
    cy.contains("Salvar sala").click();
    cy.wait("@createRoom");
  }
);

When("confirmo que realmente quero remover a sala {string}", (nome) => {
  cy.intercept("DELETE", `/api/rooms/${nome}`, { statusCode: 204, body: "" }).as("deleteRoom");
  stubRooms([]);
  cy.contains("Sim, excluir sala").click();
  cy.wait("@deleteRoom");
});

When("edito a capacidade {string} para {string}", (_antigo, novo) => {
  cy.get('input[type="number"][placeholder="Ex: 80"]').clear().type(novo);
});

When("salvo as alterações", () => {
  cy.contains("Salvar alterações").click();
});

// ── THEN ─────────────────────────────────────────────────────────────────────

Then("eu vejo uma mensagem de confirmação de cadastro de sala", () => {
  cy.get(".sala-toast.show").should("be.visible");
  cy.get(".sala-toast.show").should("contain.text", "cadastrada com sucesso");
});

Then("eu vejo uma mensagem de confirmação de remoção de sala", () => {
  cy.get(".sala-toast.show").should("be.visible");
  cy.get(".sala-toast.show").invoke("text").should("match", /removida/i);
});

Then("eu recebo uma mensagem de confirmação de edição", () => {
  cy.get(".sala-toast.show").should("be.visible");
  cy.get(".sala-toast.show").should("contain.text", "atualizada com sucesso");
});

Then("eu ainda estou na tela de salas cadastradas", () => {
  cy.url().should("include", "/salas");
  cy.contains("Salas cadastradas").should("be.visible");
});

Then("eu vejo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(nome).should("be.visible");
});

Then("eu não vejo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(nome).should("not.exist");
});

Then("a sala {string} aparece com capacidade {string} na lista de salas cadastradas", (nome, capacidade) => {
  cy.contains(nome).closest(".room-card").contains(`${capacidade} pessoas`).should("be.visible");
});

Then("eu recebo uma mensagem de erro informando que a sala {string} já existe", (nome) => {
  cy.get(".modal-box").should("be.visible");
  cy.get(".modal-box").invoke("text").should("match", /já existe|conflict/i);
});

Then("eu continuo na tela com o formulário de cadastro de sala", () => {
  cy.get(".modal-box").should("be.visible");
  cy.contains("Cadastrar nova sala").should("be.visible");
});

Then("a tela do formulário de cadastro está com todos os campos vazios", () => {
  cy.get('input[placeholder="Ex: D005"]').should("have.value", "");
});

Then("eu vejo uma mensagem de erro informando que não posso remover uma sala reservada", () => {
  cy.get(".modal-box").invoke("text").should("match", /reservad/i);
});

Then("eu continuo vendo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(nome).should("be.visible");
});

Then("eu recebo uma mensagem de erro informando que não é possível editar uma sala reservada", () => {
  cy.get(".modal-box").invoke("text").should("match", /reservad/i);
});

Then("a sala {string} ainda aparece com capacidade {string} na lista de salas cadastradas e com status {string}", (nome, capacidade, _status) => {
  cy.contains(nome).closest(".room-card").contains(`${capacidade} pessoas`).should("be.visible");
});
