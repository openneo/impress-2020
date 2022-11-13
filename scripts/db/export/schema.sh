yarn --silent mysqldump --no-data openneo_impress closet_hangers closet_lists \
  colors color_translations items item_translations modeling_logs \
  parents_swf_assets pet_types pet_states species species_translations \
  swf_assets users zones zone_translations \
  | \
  sed 's/ AUTO_INCREMENT=[0-9]*//g' \
  > $(dirname $0)/../schema-for-impress.sql \
&& yarn --silent mysqldump --no-data openneo_id users \
  | \
  sed 's/ AUTO_INCREMENT=[0-9]*//g' \
  > $(dirname $0)/../schema-for-id.sql