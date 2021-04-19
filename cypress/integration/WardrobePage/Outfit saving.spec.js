import * as page from "./page";

describe("WardrobePage: Outfit saving", () => {
  it("logs in", () => {
    cy.logInAs("dti-test");
    cy.visit("/outfits/new?species=1&color=8");

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test Outfit: ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");

    // Wait for the outfit to stop saving, and check that it redirected and
    // still shows the correct outfit name.
    page
      .getSaveOutfitButton({ timeout: 12000 })
      .should("not.have.attr", "data-loading");
    cy.location("pathname").should("match", /^\/outfits\/[0-9]+$/);
    page.getOutfitName().should("have.text", outfitName);
  });
});
