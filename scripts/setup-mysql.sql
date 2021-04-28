USE openneo_impress;

-- Public data tables: read
GRANT SELECT ON colors TO impress2020;
GRANT SELECT ON color_translations TO impress2020;
GRANT SELECT ON items TO impress2020;
GRANT SELECT ON item_translations TO impress2020;
GRANT SELECT ON modeling_logs TO impress2020;
GRANT SELECT ON parents_swf_assets TO impress2020;
GRANT SELECT ON pet_types TO impress2020;
GRANT SELECT ON pet_states TO impress2020;
GRANT SELECT ON species TO impress2020;
GRANT SELECT ON species_translations TO impress2020;
GRANT SELECT ON swf_assets TO impress2020;
GRANT SELECT ON zones TO impress2020;
GRANT SELECT ON zone_translations TO impress2020;

-- Public data tables: write. Used in modeling and support tools.
GRANT INSERT, UPDATE ON items TO impress2020;
GRANT INSERT, UPDATE ON item_translations TO impress2020;
GRANT INSERT, UPDATE, DELETE ON parents_swf_assets TO impress2020;
GRANT INSERT, UPDATE ON pet_types TO impress2020;
GRANT INSERT, UPDATE ON pet_states TO impress2020;
GRANT INSERT, UPDATE ON swf_assets TO impress2020;
GRANT INSERT ON modeling_logs TO impress2020;

-- User data tables
GRANT SELECT, INSERT, DELETE ON closet_hangers TO impress2020;
GRANT SELECT, UPDATE ON closet_lists TO impress2020;
GRANT SELECT, DELETE ON item_outfit_relationships TO impress2020;
GRANT SELECT ON neopets_connections TO impress2020;
GRANT SELECT, INSERT, UPDATE ON outfits TO impress2020;
GRANT SELECT, UPDATE ON users TO impress2020;
GRANT SELECT, UPDATE ON openneo_id.users TO impress2020;

-- mysqldump
GRANT LOCK TABLES ON * TO impress2020;
