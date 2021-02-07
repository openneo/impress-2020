// Give network requests a bit of breathing room!
const networkTimeout = { timeout: 6000 };

describe("ItemSearchPage", () => {
  // NOTE: This test depends on specific search results on certain pages, and
  //       could break if a lot of matching items are added to the site!
  it("Searches by keyword", () => {
    cy.visit("/items/search");

    // The first page should contain this item.
    cy.get("[data-test-id=item-search-input]").type("winter");
    cy.contains("A Warm Winters Night Background", networkTimeout).should(
      "exist"
    );
  });
});
