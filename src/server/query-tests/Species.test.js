const gql = require("graphql-tag");
const { query, getDbCalls } = require("./setup.js");

describe("Species", () => {
  it("loads a single species", async () => {
    const res = await query({
      query: gql`
        query {
          species(id: "1") {
            id
            name
            standardBodyId
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchInlineSnapshot(`
      Object {
        "species": Object {
          "id": "1",
          "name": "Acara",
          "standardBodyId": "93",
        },
      }
    `);
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM species WHERE id IN (?)",
          Array [
            "1",
          ],
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?) AND locale = \\"en\\"",
          Array [
            "1",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?)",
          Array [
            "1",
            "8",
          ],
        ],
      ]
    `);
  });

  it("loads all species", async () => {
    const res = await query({
      query: gql`
        query {
          allSpecies {
            id
            name
            standardBodyId
          }
        }
      `,
    });

    expect(res).toHaveNoErrors();
    expect(res.data).toMatchSnapshot();
    expect(getDbCalls()).toMatchInlineSnapshot(`
      Array [
        Array [
          "SELECT * FROM species",
        ],
        Array [
          "SELECT * FROM species_translations
             WHERE species_id IN (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AND locale = \\"en\\"",
          Array [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
            "31",
            "32",
            "33",
            "34",
            "35",
            "36",
            "37",
            "38",
            "39",
            "40",
            "41",
            "42",
            "43",
            "44",
            "45",
            "46",
            "47",
            "48",
            "49",
            "50",
            "51",
            "52",
            "53",
            "54",
            "55",
          ],
        ],
        Array [
          "SELECT * FROM pet_types WHERE (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?) OR (species_id = ? AND color_id = ?)",
          Array [
            "1",
            "8",
            "2",
            "8",
            "3",
            "8",
            "4",
            "8",
            "5",
            "8",
            "6",
            "8",
            "7",
            "8",
            "8",
            "8",
            "9",
            "8",
            "10",
            "8",
            "11",
            "8",
            "12",
            "8",
            "13",
            "8",
            "14",
            "8",
            "15",
            "8",
            "16",
            "8",
            "17",
            "8",
            "18",
            "8",
            "19",
            "8",
            "20",
            "8",
            "21",
            "8",
            "22",
            "8",
            "23",
            "8",
            "24",
            "8",
            "25",
            "8",
            "26",
            "8",
            "27",
            "8",
            "28",
            "8",
            "29",
            "8",
            "30",
            "8",
            "31",
            "8",
            "32",
            "8",
            "33",
            "8",
            "34",
            "8",
            "35",
            "8",
            "36",
            "8",
            "37",
            "8",
            "38",
            "8",
            "39",
            "8",
            "40",
            "8",
            "41",
            "8",
            "42",
            "8",
            "43",
            "8",
            "44",
            "8",
            "45",
            "8",
            "46",
            "8",
            "47",
            "8",
            "48",
            "8",
            "49",
            "8",
            "50",
            "8",
            "51",
            "8",
            "52",
            "8",
            "53",
            "8",
            "54",
            "8",
            "55",
            "8",
          ],
        ],
      ]
    `);
  });
});
