# Prepare the full manifest of URLs.
yarn archive:prepare:full \
  && \
  # Prepare the manifest of URLs already present on the remote archive.
  yarn archive:prepare:remote \
  && \
  # Sort manifest-remote.txt (what we already have backed up).
  cat $(dirname $0)/../manifest-remote.txt \
  | \
  sort \
  | \
  uniq - $(dirname $0)/../manifest-remote.sorted.txt \
  && \
  # Sort manifest-full.txt (what's available on images.neopets.com).
  cat $(dirname $0)/../manifest-full.txt \
  | \
  sort \
  | \
  uniq - $(dirname $0)/../manifest-full.sorted.txt \
  && \
  # Compute the diff between these two files, filtering to lines that start
  # with "> ", meaning it's in manifest-full.txt but not in manifest-remote.txt.
  diff $(dirname $0)/../manifest-remote.sorted.txt $(dirname $0)/../manifest-full.sorted.txt \
  | \
  grep '^>' \
  | \
  sed 's/^>\s*//' \
  | \
  # Output to manifest-delta.txt, and to the screen.
  tee $(dirname $0)/../manifest-delta.txt