import * as page from "./page";

describe("WardrobePage: Outfit saving", () => {
  it("Saves a simple Blue Acara", () => {
    cy.logInAs("dti-test");
    cy.visit("/outfits/new?species=1&color=8");

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test - Blue Acara - ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");

    // Wait for the outfit to stop saving, and check that it redirected and
    // still shows the correct outfit preview and name.
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");
    cy.location("pathname").should("match", /^\/outfits\/[0-9]+$/);
    page.getOutfitName().should("have.text", outfitName);
    page.getOutfitPreview().toMatchImageSnapshot();
  });

  it("Saves a Zafara Tourist with worn and closeted items", () => {
    cy.logInAs("dti-test");
    cy.visit(
      "/outfits/new?species=54&color=34&pose=HAPPY_FEM&objects%5B%5D=38916&objects%5B%5D=51054&objects%5B%5D=38914&closet%5B%5D=36125&closet%5B%5D=36467&closet%5B%5D=47075&closet%5B%5D=47056&closet%5B%5D=39662&closet%5B%5D=56706&closet%5B%5D=38915&closet%5B%5D=56398"
    );

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test - Zafara Tourist - ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");

    // Wait for the outfit to stop saving, and check that it redirected and
    // still shows the correct outfit preview and name.
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");
    cy.location("pathname").should("match", /^\/outfits\/[0-9]+$/);
    page.getOutfitName().should("have.text", outfitName);
    page.getOutfitPreview().toMatchImageSnapshot();
  });
});
