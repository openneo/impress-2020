import * as page from "./page";

// Give network requests a bit of breathing room!
const networkTimeout = { timeout: 12000 };

describe("WardrobePage: Basic outfit state", () => {
  it("Initialize simple outfit from URL", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    page
      .getSpeciesSelect(networkTimeout)
      .find(":selected")
      .should("have.text", "Acara");
    page.getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();

    cy.contains("A Warm Winters Night Background", networkTimeout).should(
      "exist"
    );

    page.getOutfitPreview().toMatchImageSnapshot();
  });

  it("Changes species and color", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    page
      .getSpeciesSelect(networkTimeout)
      .find(":selected")
      .should("have.text", "Acara");
    page.getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();
    page.getOutfitPreview().toMatchImageSnapshot();

    page.getSpeciesSelect().select("Aisha");

    page.getSpeciesSelect().find(":selected").should("have.text", "Aisha");
    page.getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();
    page.getOutfitPreview().toMatchImageSnapshot();

    page.getColorSelect().select("Red");

    page.getSpeciesSelect().find(":selected").should("have.text", "Aisha");
    page.getColorSelect().find(":selected").should("have.text", "Red");
    cy.location().toMatchSnapshot();
    page.getOutfitPreview().toMatchImageSnapshot();
  });

  it("Changes pose", () => {
    cy.visit("/outfits/new?species=1&color=8&pose=HAPPY_FEM");

    page.getPosePickerButton(networkTimeout).click();
    page.getPosePickerOption("Happy and Feminine").should("be.checked");
    cy.location().toMatchSnapshot();
    page.getOutfitPreview().toMatchImageSnapshot();

    page.getPosePickerOption("Sad and Masculine").check({ force: true });
    page.getPosePickerOption("Sad and Masculine").should("be.checked");
    cy.location().toMatchSnapshot();
    page.getOutfitPreview().toMatchImageSnapshot();
  });

  it("Toggles item", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    page.getOutfitPreview().toMatchImageSnapshot();
    cy.location().toMatchSnapshot();

    cy.contains("A Warm Winters Night Background").click();

    page.getOutfitPreview().toMatchImageSnapshot();
    cy.location().toMatchSnapshot();
  });

  it("Renames outfit", () => {
    cy.visit("/outfits/new?name=My+outfit&species=1&color=8");

    page.getOutfitName(networkTimeout).should("have.text", "My outfit");

    page.getOutfitName().click();
    cy.focused().type("Awesome outfit{enter}");

    page.getOutfitName().should("have.text", "Awesome outfit");
    cy.location().toMatchSnapshot();
  });
});
