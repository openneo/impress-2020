<img src="https://i.imgur.com/mZ2FCfX.png" width="200" height="200" alt="Dress to Impress beach logo" />

# Dress to Impress 2020

This is a rewrite of the Neopets customization app, Dress to Impress!

It's a React app, using the Next.js framework. (But kinda awkwardly, because it
used to be a `create-react-app`, and we never fully rearchitected from that!)

The motivating goals of the rewrite are:

- Mobile friendly, to match Neopets's move to mobile.
- Simple modern tech, to be more maintainable over time and decrease hosting costs.

## Installation guide

### Getting everything set up

We'll assume you already have your basic development environment ready! Be sure
to install the following:

- Git
- Node v16
- The Yarn package manager
- A MySQL database server

**Before you clone the repository**, install Git LFS, a tool for managing large
files in Git. (We use this for the big batch of public data that we'll import
into your dev database.)

Next, clone this repository, and ensure that
`scripts/db/public-data-from-modeling.sql.gz` is around ~30MB large. (If it's
much smaller, like 4KB, that probably means Git LFS didn't run correctly, so
the next step would be to debug that, delete the repository, and try again!)

Next, run `yarn install`. This should install the app's NPM dependencies. (You
may need to install some additional libraries to your machine for certain
dependencies to install correctly. See the instructions for
[canvas][npm-canvas] in particular!)

### Create your development database

Next, create two MySQL databases: `openneo_impress` and `openneo_id`. Then,
create a MySQL user named `impress_2020_dev` with password `impress_2020_dev`,
with full permissions for both databases.

(We're assuming that, on your local machine, your MySQL server isn't connected
to the outside internet, and that there probably won't be sensitive information
stored in your DTI database anyway, so it should be okay for this username and
password to be hardcoded.)

Finally, run `yarn db:setup-dev:full` to fill the databases
with the necessary schema, plus some real public data exported from DTI—like
items, species, and colors!

### See it work!

Okay, let's run `yarn dev`! This should start a DTI server on port 3000. Open
it in your browser and hopefully it works!! 🤞

### Optional: You might need some environment variables

In Next.js, you can set environment variables in a `.env` file, in the root of
the app. (This will be ignored by Git, thanks to our `.gitignore` file.)

Note that some the features of the site won't work without special environment
variables set, because they depend on production services we can't reproduce
locally. But they generally fail gracefully and show a helpful error message,
so you mostly won't have to worry about it until you run into it!

You mostly won't need to use this! But one early case you'll run into: for
account creation and login to work, you'll need to create a `.env` file with a
value for `DTI_AUTH_TOKEN_SECRET`: a secret string we use to cryptographically
validates the user's login cookie. In production this is a closely-guarded
secret, but for development, just open a random password generator and
copy-paste the result into `.env`!

```
DTI_AUTH_TOKEN_SECRET=jl2DFjkewkrufsIDKwhatever
```

[npm-canvas]: https://www.npmjs.com/package/canvas

## Architecture sketch

First, there's the core app, in this repository.

- **React app:** Runs mainly on the client's machine. Code in `src/app`.
- **API functions:** Run on our VPS server. Code in `api` and `src/server`.

Then, there's our various data storage components.

- **MySQL database:** Runs on our Linode VPS, colocated with the old app.
- **Amazon S3:** Stores PNGs of pet/item appearance layers, converted from the Neopets SWFs. _(Once Neopets releases HTML5-compatible assets for all their items, we can hopefully remove this!)_

Finally, there's our third-party integrations.

- **Honeycomb:** For observability & performance insights on the backend.
- **Discord:** For logging Support users' actions to a private Discord server.
- **Neopets:** We load pet data from them! And plenty of assets!
- **Fastly:** A CDN cache that sits in front of our server to help cache common requests and expensive operations. We also use them to proxy for `images.neopets.com` in some cases, so we can add crossdomain headers.

Notable old components _not_ currently included in Impress 2020:

- **Elasticsearch:** Used for lightning-fast item search queries. So far, we're finding the MySQL queries to be fast enough in practice. Might consider using some kind of fulltext query engine if that doesn't scale with more users!
- **Resque:** Used to schedule background tasks for modeling and outfit thumbnails. (We now perform these tasks on-demand, and use Fastly to cache things like thumbnails!)
- **Memcache:** Used to cache common HTML and JSON snippets. Not yet needing anything similar in Impress 2020!
- **The entire old Rails app!** No references to it in here, aside from some temporary URL links to features that aren't implemented here yet.
