yarn --silent mysqldump openneo_impress species species_translations colors \
  color_translations zones zone_translations \
  > $(dirname $0)/../public-data-constants.sql \
&& yarn --silent mysqldump openneo_impress items item_translations \
  parents_swf_assets pet_states pet_types swf_assets \
  | gzip -c \
  > $(dirname $0)/../public-data-from-modeling.sql.gz