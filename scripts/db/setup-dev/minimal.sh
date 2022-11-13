yarn mysql-dev --database=openneo_impress \
  < $(dirname $0)/../schema-for-impress.sql \
&& yarn mysql-dev --database=openneo_impress \
  < $(dirname $0)/../public-data-constants.sql \
&& yarn mysql-dev --database=openneo_id \
  < $(dirname $0)/../schema-for-id.sql