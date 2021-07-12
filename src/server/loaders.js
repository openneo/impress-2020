import DataLoader from "dataloader";
import fetch from "node-fetch";
import { normalizeRow } from "./util";

const buildClosetListLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM closet_lists WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);

    return ids.map((id) => entities.find((e) => e.id === id));
  });

const buildClosetHangersForListLoader = (db) =>
  new DataLoader(async (closetListIds) => {
    const qs = closetListIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM closet_hangers WHERE list_id IN (${qs})`,
      closetListIds
    );

    const entities = rows.map(normalizeRow);

    return closetListIds.map((closetListId) =>
      entities.filter((e) => e.listId === closetListId)
    );
  });

const buildColorLoader = (db) => {
  const colorLoader = new DataLoader(async (colorIds) => {
    const qs = colorIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM colors WHERE id IN (${qs}) AND prank = 0`,
      colorIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByColorId = new Map(entities.map((e) => [e.id, e]));

    return colorIds.map(
      (colorId) =>
        entitiesByColorId.get(String(colorId)) ||
        new Error(`could not find color ${colorId}`)
    );
  });

  colorLoader.loadAll = async () => {
    const [rows] = await db.execute(`SELECT * FROM colors WHERE prank = 0`);
    const entities = rows.map(normalizeRow);

    for (const color of entities) {
      colorLoader.prime(color.id, color);
    }

    return entities;
  };

  return colorLoader;
};

const buildColorTranslationLoader = (db) =>
  new DataLoader(async (colorIds) => {
    const qs = colorIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM color_translations
       WHERE color_id IN (${qs}) AND locale = "en"`,
      colorIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByColorId = new Map(entities.map((e) => [e.colorId, e]));

    return colorIds.map(
      (colorId) =>
        entitiesByColorId.get(String(colorId)) ||
        new Error(`could not find translation for color ${colorId}`)
    );
  });

const buildSpeciesLoader = (db) => {
  const speciesLoader = new DataLoader(async (speciesIds) => {
    const qs = speciesIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM species WHERE id IN (${qs})`,
      speciesIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesBySpeciesId = new Map(entities.map((e) => [e.id, e]));

    return speciesIds.map(
      (speciesId) =>
        entitiesBySpeciesId.get(String(speciesId)) ||
        new Error(`could not find color ${speciesId}`)
    );
  });

  speciesLoader.loadAll = async () => {
    const [rows] = await db.execute(`SELECT * FROM species`);
    const entities = rows.map(normalizeRow);

    for (const species of entities) {
      speciesLoader.prime(species.id, species);
    }

    return entities;
  };

  return speciesLoader;
};

const buildSpeciesTranslationLoader = (db) =>
  new DataLoader(async (speciesIds) => {
    const qs = speciesIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM species_translations
       WHERE species_id IN (${qs}) AND locale = "en"`,
      speciesIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesBySpeciesId = new Map(entities.map((e) => [e.speciesId, e]));

    return speciesIds.map(
      (speciesId) =>
        entitiesBySpeciesId.get(String(speciesId)) ||
        new Error(`could not find translation for species ${speciesId}`)
    );
  });

const buildTradeMatchesLoader = (db) =>
  new DataLoader(
    async (userPairs) => {
      const conditions = userPairs
        .map(
          (_) =>
            `(public_user_hangers.user_id = ? AND current_user_hangers.user_id = ? AND public_user_hangers.owned = ? AND current_user_hangers.owned = ?)`
        )
        .join(" OR ");
      const conditionValues = userPairs
        .map(({ publicUserId, currentUserId, direction }) => {
          if (direction === "public-owns-current-wants") {
            return [publicUserId, currentUserId, true, false];
          } else if (direction === "public-wants-current-owns") {
            return [publicUserId, currentUserId, false, true];
          } else {
            throw new Error(
              `unexpected user pair direction: ${JSON.stringify(direction)}`
            );
          }
        })
        .flat();

      const [rows] = await db.query(
        `
          SET SESSION group_concat_max_len = 4096;
          SELECT
            public_user_hangers.user_id AS public_user_id,
            current_user_hangers.user_id AS current_user_id,
            IF(
              public_user_hangers.owned,
              "public-owns-current-wants",
              "public-wants-current-owns"
            ) AS direction,
            GROUP_CONCAT(public_user_hangers.item_id) AS item_ids
          FROM closet_hangers AS public_user_hangers
          INNER JOIN users AS public_users ON public_users.id = public_user_hangers.user_id
          LEFT JOIN closet_lists AS public_user_lists
            ON public_user_lists.id = public_user_hangers.list_id
          INNER JOIN closet_hangers AS current_user_hangers
            ON public_user_hangers.item_id = current_user_hangers.item_id
          WHERE (
            (${conditions})
            AND (
              -- For the public user (but not the current), the hanger must be
              -- marked Trading.
              (public_user_hangers.list_id IS NOT NULL AND public_user_lists.visibility >= 2)
                OR (
                  public_user_hangers.list_id IS NULL AND public_user_hangers.owned = 1
                  AND public_users.owned_closet_hangers_visibility >= 2
                )
                OR (
                  public_user_hangers.list_id IS NULL AND public_user_hangers.owned = 0
                  AND public_users.wanted_closet_hangers_visibility >= 2
                )
            )
          )
          GROUP BY public_user_id, current_user_id;
      `,
        conditionValues
      );

      const entities = rows.map(normalizeRow);

      return userPairs.map(({ publicUserId, currentUserId, direction }) => {
        const entity = entities.find(
          (e) =>
            e.publicUserId === publicUserId &&
            e.currentUserId === currentUserId &&
            e.direction === direction
        );
        return entity ? entity.itemIds.split(",") : [];
      });
    },
    {
      cacheKeyFn: ({ publicUserId, currentUserId, direction }) =>
        `${publicUserId}-${currentUserId}-${direction}`,
    }
  );

const loadAllPetTypes = (db) => async () => {
  const [rows] = await db.execute(`SELECT species_id, color_id FROM pet_types`);
  const entities = rows.map(normalizeRow);
  return entities;
};

const buildItemLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM items WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(String(id)) ||
        new Error(`could not find item with ID: ${id}`)
    );
  });

const buildItemTranslationLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM item_translations WHERE item_id IN (${qs}) AND locale = "en"`,
      itemIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByItemId = new Map(entities.map((e) => [e.itemId, e]));

    return itemIds.map(
      (itemId) =>
        entitiesByItemId.get(String(itemId)) ||
        new Error(`could not find translation for item ${itemId}`)
    );
  });

const buildItemByNameLoader = (db, loaders) =>
  new DataLoader(
    async (names) => {
      const qs = names.map((_) => "?").join(", ");
      const normalizedNames = names.map((name) => name.trim().toLowerCase());
      const [rows] = await db.execute(
        {
          // NOTE: In our MySQL schema, this is a case-insensitive exact search.
          sql: `SELECT items.*, item_translations.* FROM item_translations
              INNER JOIN items ON items.id = item_translations.item_id
              WHERE name IN (${qs}) AND locale = "en"`,
          nestTables: true,
        },
        normalizedNames
      );

      const entitiesByName = new Map();
      for (const row of rows) {
        const item = normalizeRow(row.items);
        const itemTranslation = normalizeRow(row.item_translations);
        loaders.itemLoader.prime(item.id, item);
        loaders.itemTranslationLoader.prime(item.id, itemTranslation);

        const normalizedName = itemTranslation.name.trim().toLowerCase();
        entitiesByName.set(normalizedName, { item, itemTranslation });
      }

      return normalizedNames.map(
        (name) =>
          entitiesByName.get(name) || { item: null, itemTranslation: null }
      );
    },
    { cacheKeyFn: (name) => name.trim().toLowerCase() }
  );

const itemSearchKindConditions = {
  // NOTE: We assume that items cannot have NC rarity and the PB description,
  //       so we don't bother to filter out PB items in the NC filter, for perf.
  NC: `rarity_index IN (0, 500) OR is_manually_nc = 1`,
  NP: `rarity_index NOT IN (0, 500) AND is_manually_nc = 0 AND description NOT LIKE "%This item is part of a deluxe paint brush set!%"`,
  PB: `description LIKE "%This item is part of a deluxe paint brush set!%"`,
};

function buildItemSearchConditions({
  query,
  bodyId,
  itemKind,
  currentUserOwnsOrWants,
  currentUserId,
  zoneIds,
}) {
  // Split the query into words, and search for each word as a substring
  // of the name.
  const words = query.split(/\s+/);
  const wordMatchersForMysql = words.map(
    (word) => "%" + word.replace(/_%/g, "\\$0") + "%"
  );
  const matcherPlaceholders = words.map((_) => "t.name LIKE ?").join(" AND ");

  const itemKindCondition = itemSearchKindConditions[itemKind] || "1";
  const bodyIdCondition = bodyId
    ? "(swf_assets.body_id = ? OR swf_assets.body_id = 0)"
    : "1";
  const bodyIdValues = bodyId ? [bodyId] : [];
  const zoneIdsCondition =
    zoneIds.length > 0
      ? `swf_assets.zone_id IN (${zoneIds.map((_) => "?").join(", ")})`
      : "1";
  const currentUserJoin = currentUserOwnsOrWants
    ? `INNER JOIN closet_hangers ch ON ch.item_id = items.id`
    : "";
  const currentUserCondition = currentUserOwnsOrWants
    ? `ch.user_id = ? AND ch.owned = ?`
    : "1";
  const currentUserValues = currentUserOwnsOrWants
    ? [currentUserId, currentUserOwnsOrWants === "OWNS" ? "1" : "0"]
    : [];

  const queryJoins = `
          INNER JOIN item_translations t ON t.item_id = items.id
          INNER JOIN parents_swf_assets rel
              ON rel.parent_type = "Item" AND rel.parent_id = items.id
          INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
          ${currentUserJoin}
        `;

  const queryConditions = `
          (${matcherPlaceholders}) AND t.locale = "en" AND
          (${bodyIdCondition}) AND (${zoneIdsCondition}) AND
          (${itemKindCondition}) AND (${currentUserCondition})
        `;
  const queryConditionValues = [
    ...wordMatchersForMysql,
    ...bodyIdValues,
    ...zoneIds,
    ...currentUserValues,
  ];

  return { queryJoins, queryConditions, queryConditionValues };
}

const buildItemSearchNumTotalItemsLoader = (db) =>
  new DataLoader(async (queries) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queries.map(
      async ({
        query,
        bodyId,
        itemKind,
        currentUserOwnsOrWants,
        currentUserId,
        zoneIds = [],
      }) => {
        const {
          queryJoins,
          queryConditions,
          queryConditionValues,
        } = buildItemSearchConditions({
          query,
          bodyId,
          itemKind,
          currentUserOwnsOrWants,
          currentUserId,
          zoneIds,
        });

        const [totalRows] = await db.execute(
          `
            SELECT count(DISTINCT items.id) AS numTotalItems FROM items
            ${queryJoins}
            WHERE ${queryConditions}
          `,
          queryConditionValues
        );

        const { numTotalItems } = totalRows[0];
        return numTotalItems;
      }
    );

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildItemSearchItemsLoader = (db, loaders) =>
  new DataLoader(async (queries) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queries.map(
      async ({
        query,
        bodyId,
        itemKind,
        currentUserOwnsOrWants,
        currentUserId,
        zoneIds = [],
        offset,
        limit,
      }) => {
        const actualOffset = offset || 0;
        const actualLimit = Math.min(limit || 30, 30);

        const {
          queryJoins,
          queryConditions,
          queryConditionValues,
        } = buildItemSearchConditions({
          query,
          bodyId,
          itemKind,
          currentUserOwnsOrWants,
          currentUserId,
          zoneIds,
        });

        const [rows] = await db.execute(
          `
            SELECT DISTINCT items.*, t.name FROM items
            ${queryJoins}
            WHERE ${queryConditions}
            ORDER BY t.name
            LIMIT ? OFFSET ?
          `,
          [...queryConditionValues, actualLimit, actualOffset]
        );

        const entities = rows.map(normalizeRow);

        for (const item of entities) {
          loaders.itemLoader.prime(item.id, item);
        }

        return entities;
      }
    );

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildNewestItemsLoader = (db, loaders) =>
  new DataLoader(async (keys) => {
    // Essentially, I want to provide the loader-like API, and populate other
    // loaders, even though there's only one query to run.
    if (keys.length !== 1 && keys[0] !== "all-newest") {
      throw new Error(
        `this loader can only be loaded with the key "all-newest"`
      );
    }

    const [rows] = await db.execute(
      `SELECT * FROM items ORDER BY created_at DESC LIMIT 20;`
    );

    const entities = rows.map(normalizeRow);

    for (const entity of entities) {
      loaders.itemLoader.prime(entity.id, entity);
    }

    return [entities];
  });

async function runItemModelingQuery(db, filterToItemIds) {
  let itemIdsCondition;
  let itemIdsValues;
  if (filterToItemIds === "all") {
    // For all items, we use the condition `1`, which matches everything.
    itemIdsCondition = "1";
    itemIdsValues = [];
  } else {
    // Or, to filter to certain items, we add their IDs to the WHERE clause.
    const qs = filterToItemIds.map((_) => "?").join(", ");
    itemIdsCondition = `(item_id IN (${qs}))`;
    itemIdsValues = filterToItemIds;
  }

  return await db.execute(
    `
      SELECT T_ITEMS.item_id,
        T_BODIES.color_id,
        T_ITEMS.supports_vandagyre,
        COUNT(*) AS modeled_species_count,
        GROUP_CONCAT(
          T_BODIES.species_id
          ORDER BY T_BODIES.species_id
        ) AS modeled_species_ids,
        (
          SELECT GROUP_CONCAT(DISTINCT species_id ORDER BY species_id)
          FROM pet_types WHERE color_id = T_BODIES.color_id
        ) AS all_species_ids_for_this_color
      FROM (
        -- NOTE: I found that extracting this as a separate query that runs
        --       first made things WAAAY faster. Less to join/group, I guess?
        SELECT DISTINCT items.id AS item_id,
          swf_assets.body_id AS body_id,
          -- Vandagyre was added on 2014-11-14, so we add some buffer here.
          -- TODO: Some later Dyeworks items don't support Vandagyre.
          -- Add a manual db flag?
          items.created_at >= "2014-12-01" AS supports_vandagyre
        FROM items
        INNER JOIN parents_swf_assets psa ON psa.parent_type = "Item"
          AND psa.parent_id = items.id
        INNER JOIN swf_assets ON swf_assets.id = psa.swf_asset_id
        INNER JOIN item_translations it ON it.item_id = items.id AND it.locale = "en"
        WHERE items.modeling_status_hint IS NULL AND it.name NOT LIKE "%MME%"
          AND ${itemIdsCondition}
        ORDER BY item_id
      ) T_ITEMS
      INNER JOIN (
        SELECT DISTINCT body_id, species_id, color_id
        FROM pet_types
        WHERE color_id IN (6, 8, 44, 46)
        ORDER BY body_id, species_id
      ) T_BODIES ON T_ITEMS.body_id = T_BODIES.body_id
      GROUP BY T_ITEMS.item_id, T_BODIES.color_id
      HAVING NOT (
        -- No species (either an All Bodies item, or a Capsule type thing)
        modeled_species_count = 0
        -- Single species (probably just their item)
        OR modeled_species_count = 1
        -- All species modeled (that are compatible with this color)
        OR modeled_species_ids = all_species_ids_for_this_color
        -- All species modeled except Vandagyre, for items that don't support it
        OR (NOT T_ITEMS.supports_vandagyre AND modeled_species_count = 54 AND modeled_species_ids = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54")
      )
      ORDER BY T_ITEMS.item_id;
    `,
    [...itemIdsValues]
  );
}

const buildSpeciesThatNeedModelsForItemLoader = (db) =>
  new DataLoader(
    async (colorIdAndItemIdPairs) => {
      // Get the requested item IDs, ignoring color for now. Remove duplicates.
      let itemIds = colorIdAndItemIdPairs.map(({ itemId }) => itemId);
      itemIds = [...new Set(itemIds)];

      // Run the big modeling query, but filtered to specifically these items.
      // The filter happens very early in the query, so it runs way faster than
      // the full modeling query.
      const [rows] = await runItemModelingQuery(db, itemIds);

      const entities = rows.map(normalizeRow);

      // Finally, the query returned a row for each item combined with each
      // color built into the query (well, no row when no models needed!). So,
      // find the right row for each color/item pair, or possibly null!
      return colorIdAndItemIdPairs.map(({ colorId, itemId }) =>
        entities.find((e) => e.itemId === itemId && e.colorId === colorId)
      );
    },
    { cacheKeyFn: ({ colorId, itemId }) => `${colorId}-${itemId}` }
  );

const buildItemsThatNeedModelsLoader = (db, loaders) =>
  new DataLoader(async (keys) => {
    // Essentially, I want to take easy advantage of DataLoader's caching, for
    // this query that can only run one way ^_^` There might be a better way to
    // do this!
    if (keys.length !== 1 && keys[0] !== "all") {
      throw new Error(`this loader can only be loaded with the key "all"`);
    }

    const [rows] = await runItemModelingQuery(db, "all");

    const entities = rows.map(normalizeRow);

    const result = new Map();
    for (const { colorId, itemId, ...entity } of entities) {
      loaders.speciesThatNeedModelsForItemLoader.prime(
        { colorId, itemId },
        entity
      );

      if (!result.has(colorId)) {
        result.set(colorId, new Map());
      }
      result.get(colorId).set(itemId, entity);
    }

    return [result];
  });

const buildItemBodiesWithAppearanceDataLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      // TODO: I'm not sure this ORDER BY clause will reliably get standard
      //       bodies to the top, it seems like it depends how DISTINCT works?
      `SELECT pet_types.body_id, pet_types.species_id, items.id AS item_id
         FROM items
         INNER JOIN parents_swf_assets ON
           items.id = parents_swf_assets.parent_id AND
             parents_swf_assets.parent_type = "Item"
         INNER JOIN swf_assets ON
           parents_swf_assets.swf_asset_id = swf_assets.id
         INNER JOIN pet_types ON
           pet_types.body_id = swf_assets.body_id OR swf_assets.body_id = 0
         INNER JOIN colors ON
           pet_types.color_id = colors.id
         WHERE items.id IN (${qs})
         GROUP BY pet_types.body_id
         ORDER BY
           pet_types.species_id,
           colors.standard DESC`,
      itemIds
    );

    const entities = rows.map(normalizeRow);

    return itemIds.map((itemId) => entities.filter((e) => e.itemId === itemId));
  });

const buildItemAllOccupiedZonesLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(", ");
    const [rows] = await db.execute(
      `SELECT items.id, GROUP_CONCAT(DISTINCT sa.zone_id) AS zone_ids FROM items
       INNER JOIN parents_swf_assets psa
         ON psa.parent_type = "Item" AND psa.parent_id = items.id
       INNER JOIN swf_assets sa ON sa.id = psa.swf_asset_id
       WHERE items.id IN (${qs})
       GROUP BY items.id;`,
      itemIds
    );

    const entities = rows.map(normalizeRow);

    return itemIds.map((itemId) => {
      const item = entities.find((e) => e.id === itemId);
      if (!item) {
        return [];
      }

      return item.zoneIds.split(",");
    });
  });

const buildItemTradesLoader = (db, loaders) =>
  new DataLoader(
    async (itemIdOwnedPairs) => {
      const qs = itemIdOwnedPairs
        .map((_) => "(closet_hangers.item_id = ? AND closet_hangers.owned = ?)")
        .join(" OR ");
      const values = itemIdOwnedPairs
        .map(({ itemId, isOwned }) => [itemId, isOwned])
        .flat();
      const [rows] = await db.execute(
        {
          sql: `
            SELECT
              closet_hangers.*, closet_lists.*, users.*
              FROM closet_hangers
              INNER JOIN users ON users.id = closet_hangers.user_id
              LEFT JOIN closet_lists ON closet_lists.id = closet_hangers.list_id
              WHERE (
                (${qs})
                AND (
                  (closet_hangers.list_id IS NOT NULL AND closet_lists.visibility >= 2)
                  OR (
                    closet_hangers.list_id IS NULL AND closet_hangers.owned = 1
                    AND users.owned_closet_hangers_visibility >= 2
                  )
                  OR (
                    closet_hangers.list_id IS NULL AND closet_hangers.owned = 0
                    AND users.wanted_closet_hangers_visibility >= 2
                  )
                )
              );
          `,
          nestTables: true,
        },
        values
      );

      const entities = rows.map((row) => ({
        closetHanger: normalizeRow(row.closet_hangers),
        closetList: normalizeRow(row.closet_lists),
        user: normalizeRow(row.users),
      }));

      for (const entity of entities) {
        loaders.userLoader.prime(entity.user.id, entity.user);
        loaders.closetListLoader.prime(entity.closetList.id, entity.closetList);
      }

      return itemIdOwnedPairs.map(({ itemId, isOwned }) =>
        entities
          .filter(
            (e) =>
              e.closetHanger.itemId === itemId &&
              Boolean(e.closetHanger.owned) === isOwned
          )
          .map((e) => ({
            id: e.closetHanger.id,
            closetList: e.closetList.id ? e.closetList : null,
            user: e.user,
          }))
      );
    },
    { cacheKeyFn: ({ itemId, isOwned }) => `${itemId}-${isOwned}` }
  );

const buildItemWakaValueLoader = () =>
  new DataLoader(async (itemIds) => {
    // This loader calls our /api/allWakaValues endpoint, to take advantage of
    // the CDN caching. This helps us respond a bit faster than Google Sheets
    // API would, and avoid putting pressure on our Google Sheets API quotas.
    // (Some kind of internal memcache or process-level cache would be a more
    // idiomatic solution in a monolith server environment!)
    const url = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/allWakaValues`
      : process.env.NODE_ENV === "production"
      ? "https://impress-2020.openneo.net/api/allWakaValues"
      : "http://localhost:3000/api/allWakaValues";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Error loading /api/allWakaValues: ${res.status} ${res.statusText}`
      );
    }

    const allWakaValues = await res.json();

    return itemIds.map((itemId) => allWakaValues[itemId]);
  });

const buildPetTypeLoader = (db, loaders) =>
  new DataLoader(async (petTypeIds) => {
    const qs = petTypeIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM pet_types WHERE id IN (${qs})`,
      petTypeIds
    );

    const entities = rows.map(normalizeRow);

    for (const petType of entities) {
      loaders.petTypeBySpeciesAndColorLoader.prime(
        { speciesId: petType.speciesId, colorId: petType.colorId },
        petType
      );
    }

    return petTypeIds.map((petTypeId) =>
      entities.find((e) => e.id === petTypeId)
    );
  });

const buildPetTypeBySpeciesAndColorLoader = (db, loaders) =>
  new DataLoader(
    async (speciesAndColorPairs) => {
      const conditions = [];
      const values = [];
      for (const { speciesId, colorId } of speciesAndColorPairs) {
        conditions.push("(species_id = ? AND color_id = ?)");
        values.push(speciesId, colorId);
      }

      const [rows] = await db.execute(
        `SELECT * FROM pet_types WHERE ${conditions.join(" OR ")}`,
        values
      );

      const entities = rows.map(normalizeRow);
      const entitiesBySpeciesAndColorPair = new Map(
        entities.map((e) => [`${e.speciesId},${e.colorId}`, e])
      );

      for (const petType of entities) {
        loaders.petTypeLoader.prime(petType.id, petType);
      }

      return speciesAndColorPairs.map(({ speciesId, colorId }) =>
        entitiesBySpeciesAndColorPair.get(`${speciesId},${colorId}`)
      );
    },
    { cacheKeyFn: ({ speciesId, colorId }) => `${speciesId},${colorId}` }
  );

const buildPetTypesForColorLoader = (db, loaders) =>
  new DataLoader(async (colorIds) => {
    const qs = colorIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM pet_types WHERE color_id IN (${qs})`,
      colorIds
    );

    const entities = rows.map(normalizeRow);

    for (const petType of entities) {
      loaders.petTypeLoader.prime(petType.id, petType);
      loaders.petTypeBySpeciesAndColorLoader.prime(
        { speciesId: petType.speciesId, colorId: petType.colorId },
        petType
      );
    }

    return colorIds.map((colorId) =>
      entities.filter((e) => e.colorId === colorId)
    );
  });

const buildSwfAssetLoader = (db) =>
  new DataLoader(async (swfAssetIds) => {
    const qs = swfAssetIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM swf_assets WHERE id IN (${qs})`,
      swfAssetIds
    );

    const entities = rows.map(normalizeRow);

    return swfAssetIds.map((swfAssetId) =>
      entities.find((e) => e.id === swfAssetId)
    );
  });

const buildSwfAssetCountLoader = (db) =>
  new DataLoader(
    async (requests) => {
      const [rows] = await db.execute(
        `
          SELECT count(*) AS count, type,
            (manifest IS NOT NULL AND manifest != "") AS is_converted
          FROM swf_assets
          GROUP BY type, is_converted;
        `
      );
      const entities = rows.map(normalizeRow);

      return requests.map(({ type, isConverted }) => {
        // Find the returned rows that match this count request.
        let matchingEntities = entities;
        if (type != null) {
          matchingEntities = matchingEntities.filter((e) => e.type === type);
        }
        if (isConverted != null) {
          matchingEntities = matchingEntities.filter(
            (e) => Boolean(e.isConverted) === isConverted
          );
        }

        // Add their counts together, and return the total.
        return matchingEntities.map((e) => e.count).reduce((a, b) => a + b, 0);
      });
    },
    {
      cacheKeyFn: ({ type, isConverted }) => `${type},${isConverted}`,
    }
  );

const buildSwfAssetByRemoteIdLoader = (db) =>
  new DataLoader(
    async (typeAndRemoteIdPairs) => {
      const qs = typeAndRemoteIdPairs
        .map((_) => "(type = ? AND remote_id = ?)")
        .join(" OR ");
      const values = typeAndRemoteIdPairs
        .map(({ type, remoteId }) => [type, remoteId])
        .flat();
      const [rows] = await db.execute(
        `SELECT * FROM swf_assets WHERE ${qs}`,
        values
      );

      const entities = rows.map(normalizeRow);

      return typeAndRemoteIdPairs.map(({ type, remoteId }) =>
        entities.find((e) => e.type === type && e.remoteId === remoteId)
      );
    },
    { cacheKeyFn: ({ type, remoteId }) => `${type},${remoteId}` }
  );

const buildItemSwfAssetLoader = (db, loaders) =>
  new DataLoader(
    async (itemAndBodyPairs) => {
      const conditions = [];
      const values = [];
      for (const { itemId, bodyId } of itemAndBodyPairs) {
        conditions.push(
          "(rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))"
        );
        values.push(itemId, bodyId);
      }

      const [rows] = await db.execute(
        `SELECT sa.*, rel.parent_id FROM swf_assets sa
       INNER JOIN parents_swf_assets rel ON
         rel.parent_type = "Item" AND
         rel.swf_asset_id = sa.id
       WHERE ${conditions.join(" OR ")}`,
        values
      );

      const entities = rows.map(normalizeRow);

      for (const swfAsset of entities) {
        loaders.swfAssetLoader.prime(swfAsset.id, swfAsset);
      }

      return itemAndBodyPairs.map(({ itemId, bodyId }) =>
        entities.filter(
          (e) =>
            e.parentId === itemId && (e.bodyId === bodyId || e.bodyId === "0")
        )
      );
    },
    { cacheKeyFn: ({ itemId, bodyId }) => `${itemId},${bodyId}` }
  );

const buildPetSwfAssetLoader = (db, loaders) =>
  new DataLoader(async (petStateIds) => {
    const qs = petStateIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT sa.*, rel.parent_id FROM swf_assets sa
       INNER JOIN parents_swf_assets rel ON
         rel.parent_type = "PetState" AND
         rel.swf_asset_id = sa.id
       WHERE rel.parent_id IN (${qs})`,
      petStateIds
    );

    const entities = rows.map(normalizeRow);

    for (const swfAsset of entities) {
      loaders.swfAssetLoader.prime(swfAsset.id, swfAsset);
    }

    return petStateIds.map((petStateId) =>
      entities.filter((e) => e.parentId === petStateId)
    );
  });

const buildNeopetsConnectionLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(", ");
    const [rows] = await db.execute(
      `SELECT * FROM neopets_connections WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);

    return ids.map((id) => entities.find((e) => e.id === id));
  });

const buildOutfitLoader = (db) =>
  new DataLoader(async (outfitIds) => {
    const qs = outfitIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM outfits WHERE id IN (${qs})`,
      outfitIds
    );

    const entities = rows.map(normalizeRow);

    return outfitIds.map((outfitId) => entities.find((e) => e.id === outfitId));
  });

const buildItemOutfitRelationshipsLoader = (db) =>
  new DataLoader(async (outfitIds) => {
    const qs = outfitIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM item_outfit_relationships WHERE outfit_id IN (${qs})`,
      outfitIds
    );

    const entities = rows.map(normalizeRow);

    return outfitIds.map((outfitId) =>
      entities.filter((e) => e.outfitId === outfitId)
    );
  });

const buildPetStateLoader = (db) =>
  new DataLoader(async (petStateIds) => {
    const qs = petStateIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM pet_states WHERE id IN (${qs})`,
      petStateIds
    );

    const entities = rows.map(normalizeRow);

    return petStateIds.map((petStateId) =>
      entities.find((e) => e.id === petStateId)
    );
  });

const buildPetStatesForPetTypeLoader = (db, loaders) =>
  new DataLoader(async (petTypeIds) => {
    const qs = petTypeIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM pet_states
       WHERE pet_type_id IN (${qs})
       ORDER BY (mood_id IS NULL) ASC, mood_id ASC, female DESC,
                unconverted DESC, glitched ASC, id DESC`,
      petTypeIds
    );

    const entities = rows.map(normalizeRow);

    for (const petState of entities) {
      loaders.petStateLoader.prime(petState.id, petState);
    }

    return petTypeIds.map((petTypeId) =>
      entities.filter((e) => e.petTypeId === petTypeId)
    );
  });

/** Given a bodyId, loads the canonical PetState to show as an example. */
const buildCanonicalPetStateForBodyLoader = (db, loaders) =>
  new DataLoader(
    async (requests) => {
      // I don't know how to do this query in bulk, so we'll just do it in
      // parallel!
      return await Promise.all(
        requests.map(async ({ bodyId, preferredColorId, fallbackColorId }) => {
          // Randomly-ish choose which gender presentation to prefer, based on
          // body ID. This makes the outcome stable, which is nice for caching
          // and testing and just generally not being surprised, but sitll
          // creates an even distribution.
          const gender = bodyId % 2 === 0 ? "masc" : "fem";

          const bodyCondition = bodyId !== "0" ? `pet_types.body_id = ?` : `1`;
          const bodyValues = bodyId !== "0" ? [bodyId] : [];

          const [rows] = await db.execute(
            {
              sql: `
              SELECT pet_states.*, pet_types.* FROM pet_states
              INNER JOIN pet_types ON pet_types.id = pet_states.pet_type_id
              WHERE ${bodyCondition}
              ORDER BY
                pet_types.color_id = ? DESC, -- Prefer preferredColorId
                pet_types.color_id = ? DESC, -- Prefer fallbackColorId
                pet_states.mood_id = 1 DESC, -- Prefer Happy
                pet_states.female = ? DESC, -- Prefer given gender
                pet_states.id DESC, -- Prefer recent models (like in the app)
                pet_states.glitched ASC -- Prefer not glitched (like in the app)
              LIMIT 1`,
              nestTables: true,
            },
            [
              ...bodyValues,
              preferredColorId || "<ignore>",
              fallbackColorId,
              gender === "fem",
            ]
          );
          const petState = normalizeRow(rows[0].pet_states);
          const petType = normalizeRow(rows[0].pet_types);
          if (!petState || !petType) {
            return null;
          }

          loaders.petStateLoader.prime(petState.id, petState);
          loaders.petTypeLoader.prime(petType.id, petType);

          return petState;
        })
      );
    },
    {
      cacheKeyFn: ({ bodyId, preferredColorId, fallbackColorId }) =>
        `${bodyId}-${preferredColorId}-${fallbackColorId}`,
    }
  );

const buildPetStateByPetTypeAndAssetsLoader = (db, loaders) =>
  new DataLoader(
    async (petTypeIdAndAssetIdsPairs) => {
      const qs = petTypeIdAndAssetIdsPairs
        .map((_) => "(pet_type_id = ? AND swf_asset_ids = ?)")
        .join(" OR ");
      const values = petTypeIdAndAssetIdsPairs
        .map(({ petTypeId, swfAssetIds }) => [petTypeId, swfAssetIds])
        .flat();
      const [rows] = await db.execute(
        `SELECT * FROM pet_states WHERE ${qs}`,
        values
      );

      const entities = rows.map(normalizeRow);

      for (const petState of entities) {
        loaders.petStateLoader.prime(petState.id, petState);
      }

      return petTypeIdAndAssetIdsPairs.map(({ petTypeId, swfAssetIds }) =>
        entities.find(
          (e) => e.petTypeId === petTypeId && e.swfAssetIds === swfAssetIds
        )
      );
    },
    {
      cacheKeyFn: ({ petTypeId, swfAssetIds }) => `${petTypeId}-${swfAssetIds}`,
    }
  );

const buildUserLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM users WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(String(id)) ||
        new Error(`could not find user with ID: ${id}`)
    );
  });

const buildUserByNameLoader = (db) =>
  new DataLoader(async (names) => {
    const qs = names.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM users WHERE name IN (${qs})`,
      names
    );

    const entities = rows.map(normalizeRow);

    return names.map((name) =>
      entities.find((e) => e.name.toLowerCase() === name.toLowerCase())
    );
  });

const buildUserByEmailLoader = (db) =>
  new DataLoader(async (emails) => {
    const qs = emails.map((_) => "?").join(",");
    const [rows] = await db.execute(
      {
        sql: `
          SELECT users.*, id_users.email FROM users
          INNER JOIN openneo_id.users id_users ON id_users.id = users.remote_id
          WHERE id_users.email IN (${qs})
        `,
        nestTables: true,
      },
      emails
    );

    const entities = rows.map((row) => ({
      user: normalizeRow(row.users),
      email: row.id_users.email,
    }));

    return emails.map((email) => entities.find((e) => e.email === email).user);
  });

const buildUserClosetHangersLoader = (db) =>
  new DataLoader(async (userIds) => {
    const qs = userIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT closet_hangers.*, item_translations.name as item_name FROM closet_hangers
       INNER JOIN items ON items.id = closet_hangers.item_id
       INNER JOIN item_translations ON
         item_translations.item_id = items.id AND locale = "en"
       WHERE user_id IN (${qs})
       ORDER BY item_name`,
      userIds
    );
    const entities = rows.map(normalizeRow);

    return userIds.map((userId) =>
      entities.filter((e) => e.userId === String(userId))
    );
  });

const buildUserClosetListsLoader = (db, loaders) =>
  new DataLoader(async (userIds) => {
    const qs = userIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM closet_lists
       WHERE user_id IN (${qs})
       ORDER BY name`,
      userIds
    );

    const entities = rows.map(normalizeRow);
    for (const entity of entities) {
      loaders.closetListLoader.prime(entity.id, entity);
    }

    return userIds.map((userId) =>
      entities.filter((e) => e.userId === String(userId))
    );
  });

const buildUserOutfitsLoader = (db, loaders) =>
  new DataLoader(async (userIds) => {
    const qs = userIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM outfits
       WHERE user_id IN (${qs})
       ORDER BY name`,
      userIds
    );

    const entities = rows.map(normalizeRow);
    for (const entity of entities) {
      loaders.outfitLoader.prime(entity.id, entity);
    }

    return userIds.map((userId) =>
      entities.filter((e) => e.userId === String(userId))
    );
  });

const buildUserLastTradeActivityLoader = (db) =>
  new DataLoader(async (userIds) => {
    const qs = userIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      // This query has a custom index: index_closet_hangers_for_last_trade_activity.
      // It's on (user_id, owned, list_id, updated_at). The intent is that this
      // will enable the query planner to find the max updated_at for each
      // user/owned/list_id tuple, and then use the filter conditions later to
      // remove non-Trading lists and choose the overall _Trading_ max for the
      // user.
      //
      // I'm not 100% sure that this is exactly what the query planner does,
      // but it seems _very_ happy when it has this index: the Butterfly Shower
      // item had ~850 users offering it, and this brought the query from
      // 10-15sec to 1-2sec. An earlier version of the index, without the
      // `owned` field, and forced with `USE INDEX`, was more like 4-5 sec - so
      // I'm guessing what happened there is that forcing the index forced a
      // better query plan, but that it still held all the hangers, instead of
      // deriving intermediate maxes. (With this better index, the query
      // planner jumps at it without a hint!)
      `
        SELECT
          closet_hangers.user_id AS user_id,
            MAX(closet_hangers.updated_at) AS last_trade_activity
          FROM closet_hangers
          INNER JOIN users ON users.id = closet_hangers.user_id
          LEFT JOIN closet_lists ON closet_lists.id = closet_hangers.list_id
          WHERE (
            closet_hangers.user_id IN (${qs})
            AND (
              (closet_hangers.list_id IS NOT NULL AND closet_lists.visibility >= 2)
              OR (
                closet_hangers.list_id IS NULL AND closet_hangers.owned = 1
                AND users.owned_closet_hangers_visibility >= 2
              )
              OR (
                closet_hangers.list_id IS NULL AND closet_hangers.owned = 0
                AND users.wanted_closet_hangers_visibility >= 2
              )
            )
          )
          GROUP BY closet_hangers.user_id
      `,
      userIds
    );

    const entities = rows.map(normalizeRow);

    return userIds.map((userId) => {
      const entity = entities.find((e) => e.userId === String(userId));
      return entity ? entity.lastTradeActivity : null;
    });
  });

const buildZoneLoader = (db) => {
  const zoneLoader = new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM zones WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(String(id)) ||
        new Error(`could not find zone with ID: ${id}`)
    );
  });

  zoneLoader.loadAll = async () => {
    const [rows] = await db.execute(`SELECT * FROM zones`);
    const entities = rows.map(normalizeRow);

    for (const zone of entities) {
      zoneLoader.prime(zone.id, zone);
    }

    return entities;
  };

  return zoneLoader;
};

const buildZoneTranslationLoader = (db) =>
  new DataLoader(async (zoneIds) => {
    const qs = zoneIds.map((_) => "?").join(",");
    const [rows] = await db.execute(
      `SELECT * FROM zone_translations WHERE zone_id IN (${qs}) AND locale = "en"`,
      zoneIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByZoneId = new Map(entities.map((e) => [e.zoneId, e]));

    return zoneIds.map(
      (zoneId) =>
        entitiesByZoneId.get(String(zoneId)) ||
        new Error(`could not find translation for zone ${zoneId}`)
    );
  });

function buildLoaders(db) {
  const loaders = {};
  loaders.loadAllPetTypes = loadAllPetTypes(db);

  loaders.closetListLoader = buildClosetListLoader(db);
  loaders.closetHangersForListLoader = buildClosetHangersForListLoader(db);
  loaders.colorLoader = buildColorLoader(db);
  loaders.colorTranslationLoader = buildColorTranslationLoader(db);
  loaders.itemLoader = buildItemLoader(db);
  loaders.itemTranslationLoader = buildItemTranslationLoader(db);
  loaders.itemByNameLoader = buildItemByNameLoader(db, loaders);
  loaders.itemSearchNumTotalItemsLoader = buildItemSearchNumTotalItemsLoader(
    db
  );
  loaders.itemSearchItemsLoader = buildItemSearchItemsLoader(db, loaders);
  loaders.newestItemsLoader = buildNewestItemsLoader(db, loaders);
  loaders.speciesThatNeedModelsForItemLoader = buildSpeciesThatNeedModelsForItemLoader(
    db
  );
  loaders.itemsThatNeedModelsLoader = buildItemsThatNeedModelsLoader(
    db,
    loaders
  );
  loaders.itemBodiesWithAppearanceDataLoader = buildItemBodiesWithAppearanceDataLoader(
    db
  );
  loaders.itemAllOccupiedZonesLoader = buildItemAllOccupiedZonesLoader(db);
  loaders.itemTradesLoader = buildItemTradesLoader(db, loaders);
  loaders.itemWakaValueLoader = buildItemWakaValueLoader();
  loaders.petTypeLoader = buildPetTypeLoader(db, loaders);
  loaders.petTypeBySpeciesAndColorLoader = buildPetTypeBySpeciesAndColorLoader(
    db,
    loaders
  );
  loaders.petTypesForColorLoader = buildPetTypesForColorLoader(db, loaders);
  loaders.swfAssetLoader = buildSwfAssetLoader(db);
  loaders.swfAssetCountLoader = buildSwfAssetCountLoader(db);
  loaders.swfAssetByRemoteIdLoader = buildSwfAssetByRemoteIdLoader(db);
  loaders.itemSwfAssetLoader = buildItemSwfAssetLoader(db, loaders);
  loaders.petSwfAssetLoader = buildPetSwfAssetLoader(db, loaders);
  loaders.neopetsConnectionLoader = buildNeopetsConnectionLoader(db);
  loaders.outfitLoader = buildOutfitLoader(db);
  loaders.itemOutfitRelationshipsLoader = buildItemOutfitRelationshipsLoader(
    db
  );
  loaders.petStateLoader = buildPetStateLoader(db);
  loaders.petStatesForPetTypeLoader = buildPetStatesForPetTypeLoader(
    db,
    loaders
  );
  loaders.canonicalPetStateForBodyLoader = buildCanonicalPetStateForBodyLoader(
    db,
    loaders
  );
  loaders.petStateByPetTypeAndAssetsLoader = buildPetStateByPetTypeAndAssetsLoader(
    db,
    loaders
  );
  loaders.speciesLoader = buildSpeciesLoader(db);
  loaders.speciesTranslationLoader = buildSpeciesTranslationLoader(db);
  loaders.tradeMatchesLoader = buildTradeMatchesLoader(db);
  loaders.userLoader = buildUserLoader(db);
  loaders.userByNameLoader = buildUserByNameLoader(db);
  loaders.userByEmailLoader = buildUserByEmailLoader(db);
  loaders.userClosetHangersLoader = buildUserClosetHangersLoader(db);
  loaders.userClosetListsLoader = buildUserClosetListsLoader(db, loaders);
  loaders.userOutfitsLoader = buildUserOutfitsLoader(db, loaders);
  loaders.userLastTradeActivityLoader = buildUserLastTradeActivityLoader(db);
  loaders.zoneLoader = buildZoneLoader(db);
  loaders.zoneTranslationLoader = buildZoneTranslationLoader(db);

  return loaders;
}

module.exports = buildLoaders;
