import {
  Before,
  Given,
  Then,
  When,
} from "@badeball/cypress-cucumber-preprocessor";
import {
  buildReservationPayload,
  buildReservationUpdate,
  filterReservationsByStatus,
  formatReservationDate,
  formatReservationTime,
  toIso,
} from "../src/pages/discente/ReservasEquipamentos.jsx";

// Os mesmos steps cobrem os cenários de GUI, E2E e métodos internos.
const FRONTEND_URL = Cypress.env("FRONTEND_URL") || "http://localhost:3000";
const API_URL = Cypress.env("API_URL") || "http://localhost:8000";
const DEFAULT_PASSWORD = "senha123";

function splitDateTime(value) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  const [hour, minute] = time.slice(0, 5).split(":");
  return {
    date: `${day}/${month}/${year}`,
    hour,
    minute,
  };
}


Before({ tags: "@equipment" }, () => {
  cy.request("DELETE", `${API_URL}/test/maintenance`);
  cy.request("DELETE", `${API_URL}/test/equipment-reservations`);
  cy.request("DELETE", `${API_URL}/test/users`);
  cy.request("POST", `${API_URL}/test/rooms/seed`);
});


function createStudent(name, cpf) {
  cy.request({
    method: "POST",
    url: `${API_URL}/users/`,
    body: {
      nome: name,
      cpf,
      tipo: "discente",
      matricula: cpf,
      curso: "Computacao",
      senha: DEFAULT_PASSWORD,
    },
    failOnStatusCode: false,
  });
}


function seedEquipmentReservation({
  name,
  cpf,
  room,
  quantity,
  start,
  end,
  status,
}) {
  createStudent(name, cpf);
  cy.request({
    method: "POST",
    url: `${API_URL}/test/equipment-reservations/seed`,
    body: {
      user_cpf: cpf,
      user_name: name,
      room,
      computer_quantity: Number(quantity),
      start_time: start,
      end_time: end,
      status,
    },
  }).then((response) => {
    cy.wrap(response.body.id).as("equipmentReservationId");
  });
}


Given(
  "estou autenticado para reservar equipamentos como {string} com CPF {string}",
  (name, cpf) => {
    createStudent(name, cpf);
    cy.wrap({
      nome: name,
      cpf,
      tipo: "discente",
      senha: DEFAULT_PASSWORD,
    }).as("equipmentUser");
  },
);


Given("estou na pagina de reservas de equipamentos", () => {
  cy.get("@equipmentUser").then((user) => {
    cy.visit(`${FRONTEND_URL}/reservas-de-equipamento`, {
      onBeforeLoad(window) {
        window.localStorage.setItem("user", JSON.stringify(user));
      },
    });
  });
  cy.get('[data-cy="equipment-page-title"]').should("be.visible");
});


Given("a sala de equipamentos {string} esta em manutencao", (room) => {
  cy.request("POST", `${API_URL}/test/maintenance/seed`, {
    room,
    start_date: "2032-04-10",
    end_date: "2032-04-10",
  });
});


Given(
  "existe uma reserva de equipamentos {string} de {string} CPF {string} na sala {string} com {string} computadores de {string} ate {string}",
  (status, name, cpf, room, quantity, start, end) => {
    seedEquipmentReservation({
      name,
      cpf,
      room,
      quantity,
      start,
      end,
      status,
    });
  },
);


Given(
  "possuo uma reserva de equipamentos {string} na sala {string} com {string} computadores de {string} ate {string}",
  (status, room, quantity, start, end) => {
    cy.get("@equipmentUser").then((user) => {
      seedEquipmentReservation({
        name: user.nome,
        cpf: user.cpf,
        room,
        quantity,
        start,
        end,
        status,
      });
    });
  },
);


When(
  "preencho a reserva de equipamentos na sala {string} com {string} computadores de {string} ate {string}",
  (room, quantity, start, end) => {
    const startParts = splitDateTime(start);
    const endParts = splitDateTime(end);
    cy.get('[data-cy="equipment-room"]')
      .find("option")
      .contains(room)
      .should("exist");
    cy.get('[data-cy="equipment-room"]').select(room);
    cy.get('[data-cy="equipment-quantity"]').clear().type(quantity);
    cy.get('[data-cy="equipment-start-date"]').clear().type(startParts.date);
    cy.get('[data-cy="equipment-start-time-hour"]').select(startParts.hour);
    cy.get('[data-cy="equipment-start-time-minute"]').select(startParts.minute);
    cy.get('[data-cy="equipment-end-date"]').clear().type(endParts.date);
    cy.get('[data-cy="equipment-end-time-hour"]').select(endParts.hour);
    cy.get('[data-cy="equipment-end-time-minute"]').select(endParts.minute);
  },
);


When("confirmo a nova reserva de equipamentos", () => {
  cy.get('[data-cy="create-equipment-reservation"]').click();
});


When("edito a reserva de equipamentos da sala {string}", (room) => {
  cy.contains('[data-cy="equipment-reservation-row"]', room)
    .find('[data-cy="edit-equipment-reservation"]')
    .click();
});


When("altero a quantidade reservada para {string}", (quantity) => {
  cy.get('[data-cy="edit-equipment-quantity"]').clear().type(quantity);
});


When("salvo a reserva de equipamentos", () => {
  cy.get('[data-cy="save-equipment-reservation"]').click();
});


When("cancelo a reserva de equipamentos da sala {string}", (room) => {
  cy.contains('[data-cy="equipment-reservation-row"]', room)
    .find('[data-cy="cancel-equipment-reservation"]')
    .click();
});


When("confirmo o cancelamento da reserva de equipamentos", () => {
  cy.get('[data-cy="confirm-equipment-cancel"]').click();
});


When("filtro as reservas de equipamentos pelo status {string}", (status) => {
  cy.get('[data-cy="equipment-status-filter"]').select(status);
});


Then("vejo o aviso de equipamentos {string}", (message) => {
  cy.get('[data-cy="equipment-toast"]').should("contain", message);
});


Then("vejo o erro de equipamentos {string}", (message) => {
  cy.get('[data-cy="equipment-form-error"]').should("contain", message);
});


Then("vejo o campo para selecionar a sala de equipamentos", () => {
  cy.get('[data-cy="equipment-room"]').should("be.visible");
});


Then("vejo o campo para informar a quantidade de computadores", () => {
  cy.get('[data-cy="equipment-quantity"]').should("be.visible");
});


Then("vejo os campos de inicio e fim da reserva de equipamentos", () => {
  cy.get('[data-cy="equipment-start-date"]')
    .should("have.attr", "placeholder", "DD/MM/AAAA");
  cy.get('[data-cy="equipment-start-date-calendar"]').should("be.visible").click();
  cy.get('[data-cy="equipment-start-date-calendar-panel"]').should("be.visible");
  cy.get('[data-cy="equipment-start-date-calendar"]').click();
  cy.get('[data-cy="equipment-start-time-hour"]').should("be.visible");
  cy.get('[data-cy="equipment-start-time-minute"]').should("be.visible");
  cy.get('[data-cy="equipment-end-date"]')
    .should("have.attr", "placeholder", "DD/MM/AAAA");
  cy.get('[data-cy="equipment-end-date-calendar"]').should("be.visible");
  cy.get('[data-cy="equipment-end-time-hour"]').should("be.visible");
  cy.get('[data-cy="equipment-end-time-minute"]').should("be.visible");
});


Then("os métodos internos montam corretamente o payload da reserva", () => {
  expect(toIso("2032-04-10T08:00")).to.equal("2032-04-10T08:00:00");
  expect(buildReservationPayload({
    room: " D005 ",
    computer_quantity: "2",
    start_date: "2032-04-10",
    start_clock: "08:00",
    end_date: "2032-04-10",
    end_clock: "10:00",
  })).to.deep.equal({
    room: "D005",
    computer_quantity: 2,
    start_time: "2032-04-10T08:00:00",
    end_time: "2032-04-10T10:00:00",
  });
});


Then("os métodos internos filtram formatam e identificam alterações", () => {
  const reservations = [
    { id: 1, status: "pending" },
    { id: 2, status: "confirmed" },
  ];
  expect(filterReservationsByStatus(reservations, "pending")).to.deep.equal([
    reservations[0],
  ]);
  expect(formatReservationDate("2032-04-10T08:00:00")).to.equal("10/04/2032");
  expect(formatReservationTime("2032-04-10T08:00:00")).to.equal("08:00");
  expect(buildReservationUpdate({
    room: "D005",
    computer_quantity: "4",
    start_date: "2032-04-10",
    start_clock: "08:00",
    end_date: "2032-04-10",
    end_clock: "11:00",
  }, {
    room: "D005",
    computer_quantity: 2,
    start_time: "2032-04-10T08:00:00",
    end_time: "2032-04-10T10:00:00",
  })).to.deep.equal({
    computer_quantity: 4,
    end_time: "2032-04-10T11:00:00",
  });
});


Then("vejo o botao para confirmar a reserva de equipamentos", () => {
  cy.get('[data-cy="create-equipment-reservation"]')
    .should("be.visible")
    .and("contain", "Confirmar reserva");
});


Then(
  "vejo uma reserva de equipamentos da sala {string} com {string} computadores e status {string}",
  (room, quantity, status) => {
    cy.contains('[data-cy="equipment-reservation-row"]', room)
      .should("contain", quantity)
      .and("contain", status);
  },
);


Then("nao vejo reserva de equipamentos da sala {string}", (room) => {
  cy.contains('[data-cy="equipment-reservation-row"]', room).should("not.exist");
});


Then(
  "a reserva de equipamentos da sala {string} nao possui a acao {string}",
  (room, action) => {
    const selector = action === "Editar"
      ? '[data-cy="edit-equipment-reservation"]'
      : '[data-cy="cancel-equipment-reservation"]';
    cy.contains('[data-cy="equipment-reservation-row"]', room)
      .find(selector)
      .should("not.exist");
  },
);
