// Our local dev server is slow, give it plenty of breathing room!
// (For me, it can often take 10-15 seconds when working correctly.)
const networkTimeout = { timeout: 20000 };

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
