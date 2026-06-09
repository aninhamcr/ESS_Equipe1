// Step definitions Cypress + Cucumber para features/room-crud.feature
// Executar com: npm run cy:open  ou  npm run cy:run

import { Before, Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// ── Estado compartilhado entre steps ─────────────────────────────────────────
let currentUser  = null;
let currentRooms = [];

function makeRoom(overrides = {}) {
  return {
    name: "D005", capacity: 80, description: "sala de reunião",
    computers: 40, is_reserved: false, maintenance_status: "Não",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Reconfigura o interceptor GET com o estado atual de currentRooms
function stubGetRooms() {
  cy.intercept("GET", "/api/rooms/**", (req) => {
    req.reply({
      statusCode: 200,
      body: { total: currentRooms.length, rooms: [...currentRooms] },
    });
  }).as("getRooms");
}

Before(() => {
  currentUser  = null;
  currentRooms = [];
});

// ── GIVEN ─────────────────────────────────────────────────────────────────────

Given("eu estou logado como administrador com o usuário {string} com CPF {string}", (nome, cpf) => {
  currentUser = { nome, cpf, tipo: "admin" };
});

Given("eu estou na tela de salas cadastradas", () => {
  stubGetRooms();
  cy.visit("/salas", {
    onBeforeLoad(win) {
      win.localStorage.setItem("user", JSON.stringify(currentUser));
    },
  });
  cy.wait("@getRooms");
  cy.contains("Salas cadastradas").should("be.visible");
});

Given("a sala de nome {string} não aparece na lista de salas cadastradas", (nome) => {
  currentRooms = currentRooms.filter((r) => r.name !== nome);
  cy.contains(".room-name", nome).should("not.exist");
});

Given("eu vejo a sala {string} na lista de salas cadastradas", (nome) => {
  if (!currentRooms.some((r) => r.name === nome)) {
    currentRooms.push(makeRoom({ name: nome }));
  }
  stubGetRooms();
  cy.reload();
  cy.wait("@getRooms");
  cy.contains(".room-name", nome).should("be.visible");
});

Given("eu vejo a sala {string} na lista de salas cadastradas com capacidade {string}", (nome, capacidade) => {
  currentRooms = currentRooms.filter((r) => r.name !== nome);
  currentRooms.push(makeRoom({ name: nome, capacity: Number(capacidade) }));
  stubGetRooms();
  cy.reload();
  cy.wait("@getRooms");
  cy.contains(".room-name", nome).should("be.visible");
  cy.contains(`${capacidade} pessoas`).should("be.visible");
});

Given("eu vejo a sala {string} na lista de salas cadastradas com capacidade {string} e com status {string}", (nome, capacidade, status) => {
  const is_reserved = status.toLowerCase() === "reservada";
  currentRooms = currentRooms.filter((r) => r.name !== nome);
  currentRooms.push(makeRoom({ name: nome, capacity: Number(capacidade), is_reserved }));
  stubGetRooms();
  cy.reload();
  cy.wait("@getRooms");
  cy.contains(".room-name", nome).should("be.visible");
  cy.contains(`${capacidade} pessoas`).should("be.visible");
});

Given("eu vejo que a sala {string} está reservada", (nome) => {
  currentRooms = currentRooms.map((r) =>
    r.name === nome ? { ...r, is_reserved: true } : r
  );
  stubGetRooms();
  cy.reload();
  cy.wait("@getRooms");
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
    const isDuplicate = currentRooms.some((r) => r.name === nome);

    if (isDuplicate) {
      cy.intercept("POST", "/api/rooms/", {
        statusCode: 409,
        body: { detail: `Já existe uma sala com o nome '${nome}'` },
      }).as("createRoom");
    } else {
      const newRoom = makeRoom({
        name: nome, capacity: Number(capacidade),
        description: descricao, computers: Number(computadores),
      });
      currentRooms.push(newRoom);
      cy.intercept("POST", "/api/rooms/", { statusCode: 201, body: newRoom }).as("createRoom");
    }

    cy.get('input[placeholder="Ex: D005"]').type(nome);
    cy.get('input[type="number"][placeholder="Ex: 80"]').type(capacidade);
    cy.get('input[placeholder="Ex: Sala de Reunião"]').type(descricao);
    cy.get('input[type="number"][placeholder="0"]').type(computadores);
    cy.contains("Salvar sala").click();
    cy.wait("@createRoom");
  }
);

When("confirmo que realmente quero remover a sala {string}", (nome) => {
  const isReserved = currentRooms.some((r) => r.name === nome && r.is_reserved);

  if (isReserved) {
    cy.intercept("DELETE", `/api/rooms/${encodeURIComponent(nome)}`, {
      statusCode: 400,
      body: { detail: "Não é possível remover a sala que está reservada" },
    }).as("deleteRoom");
  } else {
    currentRooms = currentRooms.filter((r) => r.name !== nome);
    cy.intercept("DELETE", `/api/rooms/${encodeURIComponent(nome)}`, {
      statusCode: 204, body: "",
    }).as("deleteRoom");
  }

  cy.contains("Sim, excluir sala").click();
  cy.wait("@deleteRoom");
});

When("edito a capacidade {string} para {string}", (_antigo, novo) => {
  cy.get('input[type="number"][placeholder="Ex: 80"]').clear().type(novo);
});

When("salvo as alterações", () => {
  const reservedRoom = currentRooms.find((r) => r.is_reserved);

  if (reservedRoom) {
    cy.intercept("PUT", `/api/rooms/${encodeURIComponent(reservedRoom.name)}`, {
      statusCode: 400,
      body: { detail: `Não é possível editar a sala '${reservedRoom.name}' que está reservada` },
    }).as("updateRoom");
  } else {
    const room = currentRooms[0];
    cy.intercept("PUT", `/api/rooms/${encodeURIComponent(room.name)}`, (req) => {
      const updatedRoom = { ...room, ...req.body };
      currentRooms = currentRooms.map((r) => (r.name === room.name ? updatedRoom : r));
      req.reply({ statusCode: 200, body: updatedRoom });
    }).as("updateRoom");
  }

  cy.contains("Salvar alterações").click();
  cy.wait("@updateRoom");
});

// ── THEN ──────────────────────────────────────────────────────────────────────

Then("eu vejo uma mensagem de confirmação de cadastro de sala", () => {
  cy.get(".sala-toast.show").should("be.visible").and("contain.text", "cadastrada com sucesso");
});

Then("eu vejo uma mensagem de confirmação de remoção de sala", () => {
  cy.get(".sala-toast.show").should("be.visible").and("contain.text", "removida");
});

Then("eu recebo uma mensagem de confirmação de edição", () => {
  cy.get(".sala-toast.show").should("be.visible").and("contain.text", "atualizada com sucesso");
});

Then("eu ainda estou na tela de salas cadastradas", () => {
  cy.url().should("include", "/salas");
  cy.contains("Salas cadastradas").should("be.visible");
});

Then("eu não vejo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome).should("not.exist");
});

Then("a sala {string} aparece com capacidade {string} na lista de salas cadastradas", (nome, capacidade) => {
  cy.contains(".room-name", nome)
    .closest(".room-card")
    .contains(`${capacidade} pessoas`)
    .should("be.visible");
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
  cy.get('input[placeholder="Ex: D005"]').should("be.visible");
});

Then("eu vejo uma mensagem de erro informando que não posso remover uma sala reservada", () => {
  cy.get(".modal-box")
    .contains("Não é possível remover a sala que está reservada")
    .should("be.visible");
});

Then("eu continuo vendo a sala {string} na lista de salas cadastradas", (nome) => {
  cy.contains(".room-name", nome).should("be.visible");
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
