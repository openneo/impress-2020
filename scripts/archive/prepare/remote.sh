# List all the files in our bucket. (The CLI handles pagination, thank you!)
yarn aws s3 ls --recursive s3://dti-archive/ \
  | \
  # Filter out unnecessary lines; just give us lines formatted like results.
  grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}\s+[0-9]+\s+' \
  | \
  # Replace all the extra info like time and size with "https://".
  sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}\s+[0-9]+\s+/https:\/\//' \
  | \
  # Hacky urlencode; the only % value in URLs list today is %20, so...
  sed -E 's/ /%20/g' \
  | \
  # Output to manifest-remote.txt, and print to the screen.
  tee $(dirname $0)/../manifest-remote.txt