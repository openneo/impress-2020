const fetch = require("node-fetch");
const { gql } = require("apollo-server");

const typeDefs = gql`
  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!

    species: Species! # to be deprecated? can use petAppearance? 🤔
    color: Color! # to be deprecated? can use petAppearance? 🤔
    pose: Pose! # to be deprecated? can use petAppearance? 🤔
    items: [Item!]! # deprecated alias for wornItems
  }

  extend type Query {
    outfit(id: ID!): Outfit
    petOnNeopetsDotCom(petName: String!): Outfit
  }
`;

const resolvers = {
  Outfit: {
    name: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.name;
    },
    petAppearance: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return { id: outfit.petStateId };
    },
    wornItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
    closetedItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => !oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
  },
  Query: {
    outfit: (_, { id }) => ({ id }),
    petOnNeopetsDotCom: async (
      _,
      { petName },
      { db, itemLoader, itemTranslationLoader }
    ) => {
      // Start all these requests as soon as possible...
      const petMetaDataPromise = loadPetMetaData(petName);
      const customPetDataPromise = loadCustomPetData(petName);
      const modelingPromise = customPetDataPromise.then((customPetData) =>
        saveModelingData(customPetData, {
          db,
          itemLoader,
          itemTranslationLoader,
        })
      );

      // ...then wait on all of them before finishing. It's important to wait
      // on modeling, so that it doesn't get cut off when the request ends!
      const [petMetaData, customPetData, __] = await Promise.all([
        petMetaDataPromise,
        customPetDataPromise,
        modelingPromise,
      ]);

      const outfit = {
        // TODO: This isn't a fully-working Outfit object. It works for the
        //       client as currently implemented, but we'll probably want to
        //       move the client and this onto our more generic fields!
        species: { id: customPetData.custom_pet.species_id },
        color: { id: customPetData.custom_pet.color_id },
        pose: getPoseFromPetData(petMetaData, customPetData),
        items: Object.values(customPetData.object_info_registry).map((o) => ({
          id: o.obj_info_id,
          name: o.name,
          description: o.description,
          thumbnailUrl: o.thumbnail_url,
          rarityIndex: o.rarity_index,
        })),
      };

      return outfit;
    },
  },
};

async function loadPetMetaData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/PetService.getPet` + `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for pet meta data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  return json;
}

async function loadCustomPetData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
    `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for custom pet data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  if (!json.custom_pet) {
    throw new Error(`missing custom_pet data`);
  }

  return json;
}

function getPoseFromPetData(petMetaData, petCustomData) {
  // TODO: Use custom data to decide if Unconverted.
  const moodId = petMetaData.mood;
  const genderId = petMetaData.gender;
  if (String(moodId) === "1" && String(genderId) === "1") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(genderId) === "2") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(genderId) === "1") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(genderId) === "2") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(genderId) === "1") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(genderId) === "2") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `genderId=${genderId}`
    );
  }
}

async function saveModelingData(
  customPetData,
  { db, itemLoader, itemTranslationLoader }
) {
  const itemIds = Object.keys(customPetData.object_info_registry);
  const [items, itemTranslations] = await Promise.all([
    itemLoader.loadMany(itemIds),
    itemTranslationLoader.loadMany(itemIds),
  ]);

  const rowsToInsert = [];
  const rowsToUpdate = [];
  for (const index in itemIds) {
    const itemId = itemIds[index];
    const item = items[index];
    const itemTranslation = itemTranslations[index];

    const objectInfo = customPetData.object_info_registry[itemId];
    const objectInfoFields = {
      id: itemId,
      zonesRestrict: objectInfo.zones_restrict,
      thumbnailUrl: objectInfo.thumbnail_url,
      category: objectInfo.category,
      type: objectInfo.type,
      rarityIndex: objectInfo.rarity_index,
      price: objectInfo.price,
      weightLbs: objectInfo.weight_lbs,
      name: objectInfo.name,
      description: objectInfo.description,
      rarity: objectInfo.rarity,
    };

    if (item instanceof Error) {
      // New item, we'll just insert it!
      rowsToInsert.push({
        ...objectInfoFields,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      continue;
    }

    const itemFields = {
      id: item.id,
      zonesRestrict: item.zonesRestrict,
      thumbnailUrl: item.thumbnailUrl,
      category: item.category,
      type: item.type,
      rarityIndex: item.rarityIndex,
      price: item.price,
      weightLbs: item.weightLbs,
      name: itemTranslation.name,
      description: itemTranslation.description,
      rarity: itemTranslation.rarity,
    };

    if (objectsShallowEqual(objectInfoFields, itemFields)) {
      // Existing item, no change!
      continue;
    }

    // Updated item, so we'll update it!
    rowsToUpdate.push({
      ...objectInfoFields,
      updatedAt: new Date(),
    });
  }

  if (rowsToInsert.length > 0) {
    const itemQs = rowsToInsert
      .map((_) => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    const itemTranslationQs = rowsToInsert
      .map((_) => "(?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    const itemValues = rowsToInsert.map((row) => [
      row.id,
      row.zonesRestrict,
      row.thumbnailUrl,
      row.category,
      row.type,
      row.rarityIndex,
      row.price,
      row.weightLbs,
      row.createdAt,
      row.updatedAt,
    ]);
    const itemTranslationValues = rowsToInsert.map((row) => [
      row.id,
      "en",
      row.name,
      row.description,
      row.rarity,
      row.createdAt,
      row.updatedAt,
    ]);

    // NOTE: Hmm, I tried to use multiple statements to combine these, but I
    //       guess it doesn't work for prepared statements?
    await Promise.all([
      db.execute(
        `INSERT INTO items
           (
             id, zones_restrict, thumbnail_url, category, type, rarity_index,
             price, weight_lbs, created_at, updated_at
           )
           VALUES ${itemQs};
      `,
        itemValues.flat()
      ),
      db.execute(
        `INSERT INTO item_translations
          (item_id, locale, name, description, rarity, created_at, updated_at)
          VALUES ${itemTranslationQs};`,
        itemTranslationValues.flat()
      ),
    ]);
  }

  // TODO: Update the items that need updating!
}

/** Given two objects with the same keys, return whether their values match. */
function objectsShallowEqual(a, b) {
  for (const key in a) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

module.exports = { typeDefs, resolvers };
