echo 'Starting! (Note: If many of the URLs are already downloaded, it will take some time for wget to quietly check them all and find the new ones.)'
xargs --arg-file=$MANIFEST -P 8 wget --directory-prefix=${ARCHIVE_DIR=$(dirname $0)} --force-directories --no-clobber --timeout=10 --retry-connrefused --retry-on-host-error --no-cookies --compression=auto --https-only --no-verbose

# It's expected that xargs will exit with code 123 if wget failed to load some
# of the URLs. So, if it exited with 123, exit this script with 0 (success).
# Otherwise, exit with the code that xargs exited with.
# (It would be nice if we could tell wget or xargs that a 404 isn't a failure?
# And have them succeed instead? But I couldn't find a way to do that!)
XARGS_EXIT_CODE=$?
if [ $XARGS_EXIT_CODE -eq 123 ]
then
  exit 0
else
  exit $XARGS_EXIT_CODE
fi
