Cypress.Commands.add("loginAsAdmin", (nome, cpf) => {
  const user = { nome, cpf, tipo: "admin" };
  window.localStorage.setItem("user", JSON.stringify(user));
});
