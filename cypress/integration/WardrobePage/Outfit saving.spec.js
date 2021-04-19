describe("WardrobePage: Outfit saving", () => {
  it("logs in", () => {
    cy.logInAs("dti-test");
    cy.visit("/");
  });
});
