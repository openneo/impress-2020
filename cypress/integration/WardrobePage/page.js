const withTestId = (testId) => (options) =>
  cy.get(`[data-test-id="${CSS.escape(testId)}"]`, options);

export const getSpeciesSelect = withTestId("wardrobe-species-picker");
export const getColorSelect = withTestId("wardrobe-color-picker");
export const getPosePickerButton = withTestId("wardrobe-pose-picker");
export const getOutfitName = withTestId("outfit-name");
export const getSaveOutfitButton = withTestId("wardrobe-save-outfit-button");
export const getOutfitIsSavedIndicator = withTestId(
  "wardrobe-outfit-is-saved-indicator"
);

export function getPosePickerOption(label, options) {
  return cy.get(`input[aria-label="${CSS.escape(label)}"]`, options);
}

export function getOutfitPreview() {
  return cy.get("[data-test-id=wardrobe-outfit-preview]:not([data-loading])", {
    // A bit of an extra-long timeout, to await both server data and image data
    timeout: 15000,
  });
}
