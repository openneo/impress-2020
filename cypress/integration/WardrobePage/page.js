export function getSpeciesSelect(options) {
  return cy.get("[data-test-id=wardrobe-species-picker]", options);
}

export function getColorSelect(options) {
  return cy.get("[data-test-id=wardrobe-color-picker]", options);
}

export function getPosePickerButton(options) {
  return cy.get("[data-test-id=wardrobe-pose-picker]", options);
}

export function getPosePickerOption(label, options) {
  return cy.get(`input[aria-label="${CSS.escape(label)}"]`, options);
}

export function getOutfitPreview() {
  return cy.get("[data-test-id=wardrobe-outfit-preview]:not([data-loading])", {
    // A bit of an extra-long timeout, to await both server data and image data
    timeout: 15000,
  });
}

export function getOutfitName(options) {
  return cy.get("[data-test-id=outfit-name]", options);
}

export function getSaveOutfitButton(options) {
  return cy.get("[data-test-id=wardrobe-save-outfit-button]", options);
}
