cat $(dirname $0)/../manifest-delta.txt \
  | \
  # Remove the URL scheme to convert it to a folder path in our archive
  sed -E 's/^https?:\/\///' \
  | \
  # Hacky urldecode; the only % value in the URLs list today is %20, so...
  sed -E 's/%20/ /g' \
  | \
  # Upload each URL to the remote archive!
  # NOTE: This is slower than I'd hoped, probably because each command has to
  #       set up a new connection? If we needed to be faster, we could refactor
  #       the `create` step to download to a temporary delta folder, then `cp`
  #       that into the main archive, but run `aws s3 sync` on just the delta
  #       folder (with care not to delete keys that are present in the remote
  #       archive but not in the delta folder!). But this seems to run at an
  #       acceptable speed (i.e. a few hours) when it's run daily.
  while read -r path; do
    yarn aws s3 cp $ARCHIVE_DIR/$path s3://$ARCHIVE_STORAGE_BUCKET/$path;
  done
  