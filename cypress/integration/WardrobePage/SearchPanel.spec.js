// Our local dev server is slow, give it plenty of breathing room!
// (For me, it can often take 10-15 seconds when working correctly.)
const networkTimeout = { timeout: 20000 };

describe("WardrobePage: SearchPanel", () => {
  // NOTE: This test depends on specific search results on certain pages, and
  //       could break if a lot of matching items are added to the site!
  it("Searches by keyword", () => {
    cy.visit("/outfits/new");

    // The first page should contain this item.
    cy.get("[data-test-id=item-search-input]").type("winter");
    cy.contains("A Warm Winters Night Background", networkTimeout).should(
      "exist"
    );

    // And the second page should contain this item.
    cy.get("[data-test-id=search-panel-scroll-container]").scrollTo("bottom");
    cy.contains(
      "Dyeworks Green: Winter Poinsettia Staff",
      networkTimeout
    ).should("exist");
  });

  it("Only shows items that fit", () => {
    cy.visit("/outfits/new");

    // Searching for Christmas paintbrush items should show the Acara items,
    // but not the Aisha items.
    cy.get("[data-test-id=item-search-input]")
      .type("pb{enter}")
      .type("christmas");
    cy.contains("Christmas Acara Coat", networkTimeout).should("exist");
    cy.contains("Christmas Aisha Collar").should("not.exist");
  });
});
