USE openneo_impress;

-- Public data tables: read
GRANT SELECT ON colors TO impress2020;
GRANT SELECT ON color_translations TO impress2020;
GRANT SELECT ON items TO impress2020;
GRANT SELECT ON item_translations TO impress2020;
GRANT SELECT ON parents_swf_assets TO impress2020;
GRANT SELECT ON pet_types TO impress2020;
GRANT SELECT ON pet_states TO impress2020;
GRANT SELECT ON species TO impress2020;
GRANT SELECT ON species_translations TO impress2020;
GRANT SELECT ON swf_assets TO impress2020;
GRANT SELECT ON zones TO impress2020;
GRANT SELECT ON zone_translations TO impress2020;

-- Public data tables: write
GRANT UPDATE ON items TO impress2020;
GRANT DELETE ON parents_swf_assets TO impress2020;
GRANT UPDATE ON pet_states TO impress2020;
GRANT UPDATE ON swf_assets TO impress2020;

-- User data tables
GRANT SELECT ON closet_hangers TO impress2020;
GRANT SELECT ON closet_lists TO impress2020;
GRANT SELECT ON item_outfit_relationships TO impress2020;
GRANT SELECT ON outfits TO impress2020;
GRANT SELECT ON users TO impress2020;

-- Procedures used in the application

DELIMITER $$

DROP PROCEDURE IF EXISTS GetItemsThatNeedModelsV2$$
CREATE PROCEDURE GetItemsThatNeedModelsV2()
BEGIN
  SELECT pet_types.color_id AS color_id, items.id AS item_id,
    GROUP_CONCAT(DISTINCT pet_types.species_id ORDER BY pet_types.species_id)
      AS modeled_species_ids,
    -- Vandagyre was added on 2014-11-14, so we add some buffer here.
    -- TODO: Some later Dyeworks items don't support Vandagyre.
    -- Add a manual db flag?
    items.created_at >= "2014-12-01" AS supports_vandagyre
  FROM items
  INNER JOIN parents_swf_assets psa
    ON psa.parent_type = "Item" AND psa.parent_id = items.id
  INNER JOIN swf_assets
    ON swf_assets.id = psa.swf_asset_id
  INNER JOIN pet_types
    ON pet_types.body_id = swf_assets.body_id
  WHERE
    pet_types.color_id IN (
       8, -- Blue (Standard)
       6, -- Baby
      44, -- Maraquan
      46  -- Mutant
    )
    AND items.modeling_status_hint IS NULL
  GROUP BY color_id, item_id
  HAVING
    NOT (
      -- No species (either an All Bodies item, or a Capsule type thing)
      count(DISTINCT pet_types.species_id) = 0
      -- Single species (probably just their item)
      OR count(DISTINCT pet_types.species_id) = 1
      -- All species modeled
      OR count(DISTINCT pet_types.species_id) = 55
      -- All species modeled except Vandagyre, for items that don't support it
      OR (NOT supports_vandagyre AND modeled_species_ids = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54")
    )
  ORDER BY color_id, item_id;
END$$
GRANT EXECUTE ON PROCEDURE GetItemsThatNeedModelsV2 TO impress2020$$

-- This procedure is a performance optimization! We want the page to always be
-- up-to-date, but we want to avoid re-running this query if modeling data
-- hasn't changed. So, we use the last contribution timestamp as a cache hint
-- for whether the data has expired. But in this environment, sequential
-- queries are a bottleneck, so I bundled up that logic into this single
-- procedure that can run on the database! That way, it's just one network
-- round-trip instead of two, which makes a noticeable difference in our stack.
DROP PROCEDURE IF EXISTS GetItemsThatNeedModelsIfNotCachedV2$$
CREATE PROCEDURE GetItemsThatNeedModelsIfNotCachedV2(
  IN last_known_update TIMESTAMP,
  OUT last_actual_update TIMESTAMP
)
BEGIN
  SET last_actual_update =
    (SELECT created_at FROM contributions ORDER BY id DESC LIMIT 1);

  IF last_known_update < last_actual_update THEN
    CALL GetItemsThatNeedModelsV2();
  END IF;
END$$
GRANT EXECUTE ON PROCEDURE GetItemsThatNeedModelsIfNotCachedV2 TO impress2020$$

DELIMITER ;
