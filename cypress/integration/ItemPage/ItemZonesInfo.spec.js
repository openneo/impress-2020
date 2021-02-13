// Give network requests a bit of breathing room! (A bit more, because this
// page has a lot of data!)
const networkTimeout = { timeout: 10000 };

describe("ItemZonesInfo", () => {
  it("shows simple zone data for an all-species Background", () => {
    cy.visit("/items/37375");
    cy.get("[data-test-id='item-zones-info']", networkTimeout).should(
      "have.text",
      "Zone: Background"
    );
  });

  it("shows simple zone data for a species-specific Hat", () => {
    cy.visit("/items/34985");
    cy.get("[data-test-id='item-zones-info']", networkTimeout).should(
      "have.text",
      "Zone: Hat"
    );
  });

  it("shows distinct zone data for an all-species in-hand item", () => {
    cy.visit("/items/43397");
    cy.get("[data-test-id='item-zones-info']", networkTimeout).should(
      "have.text",
      "Zones: Right-hand Item (52 species)" + "Left-hand Item (2 species)"
    );

    cy.contains("(52 species)").focus();
    cy.contains(
      "Acara, Aisha, Blumaroo, Bori, Bruce, Buzz, Chia, Chomby, Cybunny, Draik, Elephante, Eyrie, Flotsam, Gelert, Gnorbu, Grarrl, Grundo, Hissi, Ixi, Jetsam, Jubjub, Kacheek, Kau, Kiko, Koi, Korbat, Kougra, Krawk, Kyrii, Lupe, Lutari, Meerca, Moehog, Mynci, Nimmo, Ogrin, Peophin, Poogle, Pteri, Quiggle, Ruki, Scorchio, Shoyru, Skeith, Techo, Tonu, Uni, Usul, Wocky, Xweetok, Yurble, Zafara"
    ).should("exist");

    cy.contains("(2 species)").focus();
    cy.contains("Lenny, Tuskaninny").should("exist");
  });

  it("shows simple zone data for a Mutant-only Dress", () => {
    cy.visit("/items/70564");
    cy.get("[data-test-id='item-zones-info']", networkTimeout).should(
      "have.text",
      "Zone: Shirt/Dress"
    );
  });
});
