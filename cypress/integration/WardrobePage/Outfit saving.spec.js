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

  it("Saves an outfit, then toggles an item to auto-save it", () => {
    cy.logInAs("dti-test");
    cy.visit("/outfits/new?species=1&color=8&closet[]=78104");

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test - Auto-Save on Items - ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit, and wait for it to finish.
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");

    // Click the background to toggle it on.
    cy.contains("#1 Fan Room Background").click();

    // Wait for the outfit to start auto-saving, then finish again.
    page.getOutfitIsSavingIndicator({ timeout: 5000 }).should("exist");
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");

    // Reload the page. The outfit preview should still contain the background.
    cy.reload();
    page.getOutfitPreview({ timeout: 20000 }).toMatchImageSnapshot();
  });

  it("Saves an outfit, then changes the color to auto-save it", () => {
    cy.logInAs("dti-test");
    cy.visit("/outfits/new?species=1&color=8");

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test - Auto-Save on Color - ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit, and wait for it to finish.
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");

    // Change the color from Blue to Red.
    page.getColorSelect().select("Red");

    // Wait for the outfit to start auto-saving, then finish again.
    page.getOutfitIsSavingIndicator({ timeout: 5000 }).should("exist");
    page.getOutfitIsSavedIndicator({ timeout: 12000 }).should("exist");

    // Reload the page. The outfit preview should still show a Red Acara.
    cy.reload();
    page.getOutfitPreview({ timeout: 20000 }).toMatchImageSnapshot();
  });

  it("prompts before navigating away from unsaved changes", () => {
    // Create stub methods to reject navigation confirmation prompts. We need
    // `confirm` for react-router's client-side nav, and `before:unload` for
    // the browser's built-in full-page nav prompts.
    const confirmStub = cy.stub().returns(false);
    cy.on("window:confirm", confirmStub);
    const beforeUnloadStub = cy.stub();
    cy.on("window:before:unload", beforeUnloadStub);

    cy.logInAs("dti-test");
    cy.visit("/outfits/new?species=1&color=8");

    // Give the outfit a unique timestamped name
    const outfitName = `Cypress Test - Block Navigation - ${new Date().toISOString()}`;
    page.getOutfitName({ timeout: 12000 }).click();
    cy.focused().type(outfitName + "{enter}");

    // Save the outfit, but don't wait for it to finish.
    page.getSaveOutfitButton().click().should("have.attr", "data-loading");

    // Click the big back button, and observe that it triggers a confirm prompt.
    // We'll reject it. HACK: It's a bit flaky if you try the clicks
    // immediately in sequence. Is there a better way to do this?
    page.showOutfitControls();
    cy.wait(100); // eslint-disable-line cypress/no-unnecessary-waiting
    page.getNavBackButton().click();
    cy.wrap(confirmStub).should("be.called");

    // Try to reload the page, and observe that it would trigger the browser's
    // built-in prompt, i.e., `defaultPrevented`. Cypress will automatically
    // confirm the simulated prompt, and complete the reload.
    cy.reload();
    cy.wrap(beforeUnloadStub).should(
      "be.calledWith",
      Cypress.sinon.match((e) => e.defaultPrevented)
    );
  });
});
