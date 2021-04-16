// Give network requests a bit of breathing room!
const networkTimeout = { timeout: 12000 };

describe("WardrobePage: Basic outfit state", () => {
  it("Initialize simple outfit from URL", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    getSpeciesSelect(networkTimeout)
      .find(":selected")
      .should("have.text", "Acara");
    getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();

    cy.contains("A Warm Winters Night Background", networkTimeout).should(
      "exist"
    );

    getOutfitPreview().toMatchImageSnapshot();
  });

  it("Changes species and color", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    getSpeciesSelect(networkTimeout)
      .find(":selected")
      .should("have.text", "Acara");
    getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();
    getOutfitPreview().toMatchImageSnapshot();

    getSpeciesSelect().select("Aisha");

    getSpeciesSelect().find(":selected").should("have.text", "Aisha");
    getColorSelect().find(":selected").should("have.text", "Blue");
    cy.location().toMatchSnapshot();
    getOutfitPreview().toMatchImageSnapshot();

    getColorSelect().select("Red");

    getSpeciesSelect().find(":selected").should("have.text", "Aisha");
    getColorSelect().find(":selected").should("have.text", "Red");
    cy.location().toMatchSnapshot();
    getOutfitPreview().toMatchImageSnapshot();
  });

  it.only("Changes pose", () => {
    cy.visit("/outfits/new?species=1&color=8&pose=HAPPY_FEM");

    getPosePickerButton(networkTimeout).click();
    getPosePickerOption("Happy and Feminine").should("be.checked");
    cy.location().toMatchSnapshot();
    getOutfitPreview().toMatchImageSnapshot();

    getPosePickerOption("Sad and Masculine").check({ force: true });
    getPosePickerOption("Sad and Masculine").should("be.checked");
    cy.location().toMatchSnapshot();
    getOutfitPreview().toMatchImageSnapshot();
  });

  it("Toggles item", () => {
    cy.visit("/outfits/new?species=1&color=8&objects[]=76789");

    getOutfitPreview().toMatchImageSnapshot();
    cy.location().toMatchSnapshot();

    cy.contains("A Warm Winters Night Background").click();

    getOutfitPreview().toMatchImageSnapshot();
    cy.location().toMatchSnapshot();
  });

  it("Renames outfit", () => {
    cy.visit("/outfits/new?name=My+outfit&species=1&color=8");

    getOutfitName(networkTimeout).should("have.text", "My outfit");

    getOutfitName().click().type("Awesome outfit{enter}");

    getOutfitName().should("have.text", "Awesome outfit");
    cy.location().toMatchSnapshot();
  });
});

function getSpeciesSelect(options) {
  return cy.get("[data-test-id=wardrobe-species-picker]", options);
}

function getColorSelect(options) {
  return cy.get("[data-test-id=wardrobe-color-picker]", options);
}

function getPosePickerButton(options) {
  return cy.get("[data-test-id=wardrobe-pose-picker]", options);
}

function getPosePickerOption(label, options) {
  return cy.get(`input[aria-label="${CSS.escape(label)}"]`, options);
}

function getOutfitPreview() {
  return cy.get("[data-test-id=wardrobe-outfit-preview]:not([data-loading])", {
    // A bit of an extra-long timeout, to await both server data and image data
    timeout: 15000,
  });
}

function getOutfitName(options) {
  return cy.get("[data-test-id=outfit-name]", options);
}
