# Sort urls-cache-backup.txt (what we already have backed up).
cat $(dirname $0)/urls-cache-backup.txt \
  | \
  sort \
  | \
  uniq - $(dirname $0)/urls-cache-backup.sorted.txt \
  && \
  # Sort urls-cache.txt (what's available on images.neopets.com).
  cat $(dirname $0)/urls-cache.txt \
  | \
  sort \
  | \
  uniq - $(dirname $0)/urls-cache.sorted.txt \
  && \
  # Compute the diff between these two files, filtering to lines that start
  # with "> ", meaning it's in urls-cache.txt but not in urls-cache-backup.txt.
  diff $(dirname $0)/urls-cache-backup.sorted.txt $(dirname $0)/urls-cache.sorted.txt \
  | \
  grep '^>' \
  | \
  sed 's/^>\s*//' \
  | \
  # Output to urls-cache-delta.txt, and to the screen.
  tee $(dirname $0)/urls-cache-delta.txt