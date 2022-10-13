# Run archive:create:download-urls, but using our delta URLs file specifically.
URLS_CACHE=$(dirname $0)/urls-cache-delta.txt \
  yarn archive:create:download-urls