// Adapted from https://github.com/apollographql/apollo-server/blob/201630ad284754248fc9ab6ebedc7506fcc3d951/packages/apollo-server-lambda/src/ApolloServer.ts

import { ApolloServerBase, runHttpQuery } from "apollo-server-core";

import { Headers } from "apollo-server-env";
import { renderPlaygroundPage } from "@apollographql/graphql-playground-html";

function graphqlVercel(options) {
  if (!options) {
    throw new Error("Apollo Server requires options.");
  }

  if (arguments.length > 1) {
    throw new Error(
      `Apollo Server expects exactly one argument, got ${arguments.length}`
    );
  }

  const graphqlHandler = async (req, res) => {
    if (req.httpMethod === "POST" && !req.body) {
      res.status(500).write("POST body missing.");
      return;
    }
    let result;
    try {
      result = await runHttpQuery([req, res], {
        method: req.method,
        options: options,
        query: req.method === "POST" && req.body ? req.body : req.query,
        request: {
          url: req.path,
          method: req.method,
          headers: new Headers(req.headers),
        },
      });
    } catch (error) {
      if ("HttpQueryError" !== error.name) {
        console.error(error);
        return;
      }
      setHeaders(res, new Headers(error.headers))
        .status(error.statusCode)
        .write(error.message);
      return;
    }

    const { graphqlResponse, responseInit } = result;
    setHeaders(res, new Headers(responseInit.headers));
    res.write(graphqlResponse);
  };

  return graphqlHandler;
}

class ApolloServer extends ApolloServerBase {
  // If you feel tempted to add an option to this constructor. Please consider
  // another place, since the documentation becomes much more complicated when
  // the constructor is not longer shared between all integration
  constructor(options) {
    if (process.env.ENGINE_API_KEY || options.engine) {
      options.engine = {
        sendReportsImmediately: true,
        ...(typeof options.engine !== "boolean" ? options.engine : {}),
      };
    }
    super(options);
  }

  // This translates the arguments from the middleware into graphQL options It
  // provides typings for the integration specific behavior, ideally this would
  // be propagated with a generic to the super class
  createGraphQLServerOptions(req, res) {
    return super.graphQLServerOptions({ req, res });
  }

  createHandler({ cors } = { cors: undefined }) {
    // We will kick off the `willStart` event once for the server, and then
    // await it before processing any requests by incorporating its `await` into
    // the GraphQLServerOptions function which is called before each request.
    const promiseWillStart = this.willStart();

    const corsHeaders = new Headers();

    if (cors) {
      if (cors.methods) {
        if (typeof cors.methods === "string") {
          corsHeaders.set("access-control-allow-methods", cors.methods);
        } else if (Array.isArray(cors.methods)) {
          corsHeaders.set(
            "access-control-allow-methods",
            cors.methods.join(",")
          );
        }
      }

      if (cors.allowedHeaders) {
        if (typeof cors.allowedHeaders === "string") {
          corsHeaders.set("access-control-allow-headers", cors.allowedHeaders);
        } else if (Array.isArray(cors.allowedHeaders)) {
          corsHeaders.set(
            "access-control-allow-headers",
            cors.allowedHeaders.join(",")
          );
        }
      }

      if (cors.exposedHeaders) {
        if (typeof cors.exposedHeaders === "string") {
          corsHeaders.set("access-control-expose-headers", cors.exposedHeaders);
        } else if (Array.isArray(cors.exposedHeaders)) {
          corsHeaders.set(
            "access-control-expose-headers",
            cors.exposedHeaders.join(",")
          );
        }
      }

      if (cors.credentials) {
        corsHeaders.set("access-control-allow-credentials", "true");
      }
      if (typeof cors.maxAge === "number") {
        corsHeaders.set("access-control-max-age", cors.maxAge.toString());
      }
    }

    return async (req, res) => {
      // Make a request-specific copy of the CORS headers, based on the server
      // global CORS headers we've set above.
      const requestCorsHeaders = new Headers(corsHeaders);

      if (cors && cors.origin) {
        const requestOrigin = req.headers["origin"];
        if (typeof cors.origin === "string") {
          requestCorsHeaders.set("access-control-allow-origin", cors.origin);
        } else if (
          requestOrigin &&
          (typeof cors.origin === "boolean" ||
            (Array.isArray(cors.origin) &&
              requestOrigin &&
              cors.origin.includes(requestOrigin)))
        ) {
          requestCorsHeaders.set("access-control-allow-origin", requestOrigin);
        }

        const requestAccessControlRequestHeaders =
          req.headers["access-control-request-headers"];
        if (!cors.allowedHeaders && requestAccessControlRequestHeaders) {
          requestCorsHeaders.set(
            "access-control-allow-headers",
            requestAccessControlRequestHeaders
          );
        }
      }

      // Convert the `Headers` into an object which can be spread into the
      // various headers objects below.
      // Note: while Object.fromEntries simplifies this code, it's only currently
      //       supported in Node 12 (we support >=6)
      const requestCorsHeadersObject = Array.from(requestCorsHeaders).reduce(
        (headersObject, [key, value]) => {
          headersObject[key] = value;
          return headersObject;
        },
        {}
      );

      if (res.method === "OPTIONS") {
        setHeaders(res, requestCorsHeadersObject).status(204);
        return;
      }

      if (this.playgroundOptions && req.method === "GET") {
        const acceptHeader = req.headers["accept"];
        if (acceptHeader && acceptHeader.includes("text/html")) {
          const path = req.path || "/";

          const playgroundRenderPageOptions = {
            endpoint: path,
            ...this.playgroundOptions,
          };

          setHeaders(
            res,
            new Headers({
              "Content-Type": "text/html",
              ...requestCorsHeadersObject,
            })
          )
            .status(200)
            .write(renderPlaygroundPage(playgroundRenderPageOptions));
          return;
        }
      }

      await graphqlVercel(async () => {
        // In a world where this `createHandler` was async, we might avoid this
        // but since we don't want to introduce a breaking change to this API
        // (by switching it to `async`), we'll leverage the
        // `GraphQLServerOptions`, which are dynamically built on each request,
        // to `await` the `promiseWillStart` which we kicked off at the top of
        // this method to ensure that it runs to completion (which is part of
        // its contract) prior to processing the request.
        await promiseWillStart;
        return this.createGraphQLServerOptions(req, res);
      })(req, res);
    };
  }
}

function setHeaders(res, headers) {
  for (const [name, value] of headers.entries()) {
    res.setHeader(name, value);
  }
  return res;
}

module.exports = { ApolloServer };
