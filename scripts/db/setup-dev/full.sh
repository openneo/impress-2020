$(dirname $0)/minimal.sh \
&& gzip -d -c $(dirname $0)/../public-data-from-modeling.sql.gz \
  | yarn mysql-dev --database=openneo_impress