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
export const getOutfitIsSavingIndicator = withTestId(
  "wardrobe-outfit-is-saving-indicator"
);

export function getPosePickerOption(label, options) {
  return cy.get(`input[aria-label="${CSS.escape(label)}"]`, options);
}

export function getOutfitPreview(options = { timeout: 15000 }) {
  // HACK: To return the screenshottable preview *area* (which is what this
  //       function is currently used for), we select the first img tag. That's
  //       because the app relies on CSS `object-fit` to get images to position
  //       correctly, rather than styling the container. This will still
  //       screenshot the full preview, because Cypress can't separate the
  //       layers! It just screenshots the bounded area.
  //
  // TODO: The way the layer positioning works is a bit fragile tbh, and the
  //       canvases already do math; it could make sense to just have the
  //       container use the same math, or some clever CSS?
  //
  // NOTE: The tests need to run in a 600x600 actual window, or else the
  //       snapshot will come out smaller. This because our snapshot plugin
  //       performs its snapshot within the window's natural area, rather than
  //       the simulated area that most tests run in.
  return cy
    .get("[data-test-id=wardrobe-outfit-preview]:not([data-loading])", options)
    .get("img")
    .first();
}
