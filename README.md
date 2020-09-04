<img src="https://i.imgur.com/mZ2FCfX.png" width="200" height="200" alt="Dress to Impress beach logo" />

# Dress to Impress 2020

This is a rewrite of the Neopets customization app, Dress to Impress!

It's a React app, built with `create-react-app`, running on Vercel, JAMstack-style.

The motivating goals of the rewrite are:
- Mobile friendly, to match Neopets's move to mobile.
- Simple modern tech, to be more maintainable over time and decrease hosting costs.

If you want to contribute, please reach out to Matchu! This repository is _almost_ shareable, but the main limitation is that we currently run even our development server against the production database, and those credentials are private. But we can change that if there's interest!

## Architecture sketch

First, there's the core app, in this repository.
- **React app:** Runs on Vercel's CDN. Code in `src/app`.
- **API functions:** Run on Vercel's Serverless Functions. Code in `api` and `src/server`.

Then, there's our various data storage components.
- **MySQL database:** Runs on our Linode VPS, colocated with the old app.
- **Amazon S3:** Stores PNGs of pet/item appearance layers, converted from the Neopets SWFs. *(Once Neopets releases HTML5-compatible assets for all their items, we can hopefully remove this!)*

Finally, there's our third-party integrations.
- **Auth0:** For authentication. Data imported from our old OpenNeo ID auth database.
- **Honeycomb:** For observability & performance insights on the backend.
- **Discord:** For logging Support users' actions to a private Discord server.
- **Neopets:** We load pet data from them! And plenty of assets!

Notable old components _not_ currently included in Impress 2020:
- **Elasticsearch:** Used for lightning-fast item search queries. So far, we're finding the MySQL queries to be fast enough in practice. Might consider using some kind of fulltext query engine if that doesn't scale with more users!
- **Resque:** Used to schedule background tasks for modeling and outfit thumbnails.
- **Outfit thumbnail generation:** Used for outfit thumbnails in the app. I'm wondering if there's a way to get away with not doing this, like just rendering the layers... but I suppose if we want a good social share experience, then we'll probably want this. Maybe we can generate them on the fly as API requests, instead of adding a data storage component?
- **Memcache:** Used to cache common HTML and JSON snippets. Not yet needing anything similar in Impress 2020!
