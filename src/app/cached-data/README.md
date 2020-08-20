The data in this folder is read from the database on build, and included in the
JS bundle we ship to the client.

We do this for small stable database tables, where the round-trip between the
cloud server and the database creates noticeable latency.

The build itself happens in `scripts/build-cached-data.js`, as part of both the
`yarn build` production build process, and the `yarn start` dev server process.

The require happens in `src/app/apolloClient.js`, when we build our local
field resolvers. That way, most of the app is unaware of the distinction
between server data and client-cached data. But you _will_ see GQL queries
decorate the relevant fields with `@client`, to make clear that we don't want
to load from the server!

NOTE: We could consider pulling this data out of the database altogether, and
just commit it to the codebase? But, because we're still fragmented across two
apps, I'd rather maintain one source of truth, and use this simple code to be
confident that everything's always in sync.
