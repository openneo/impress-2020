import {
  DirectiveNode,
  getNamedType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  ResponsePath,
  responsePathAsArray,
} from 'graphql';
import { ApolloServerPlugin } from "apollo-server-plugin-base";

export interface CacheControlFormat {
  version: 1;
  hints: ({ path: (string | number)[] } & CacheHint)[];
}

export interface CacheHint {
  maxAge?: number;
  scope?: CacheScope;
  // FORK: Added this directive field!
  staleWhileRevalidate?: number;
}

export enum CacheScope {
  Public = 'PUBLIC',
  Private = 'PRIVATE',
}

export interface CacheControlExtensionOptions {
  defaultMaxAge?: number;
  // FIXME: We should replace these with
  // more appropriately named options.
  calculateHttpHeaders?: boolean;
  stripFormattedExtensions?: boolean;
}

declare module 'graphql/type/definition' {
  interface GraphQLResolveInfo {
    cacheControl: {
      setCacheHint: (hint: CacheHint) => void;
      cacheHint: CacheHint;
    };
  }
}

declare module 'apollo-server-types' {
  interface GraphQLRequestContext<TContext> {
    // Not readonly: plugins can set it.
    overallCachePolicy?: Required<CacheHint> | undefined;
  }
}

type MapResponsePathHints = Map<ResponsePath, CacheHint>;

export const plugin = (
  options: CacheControlExtensionOptions = Object.create(null),
): ApolloServerPlugin => ({
  requestDidStart(requestContext) {
    const defaultMaxAge: number = options.defaultMaxAge || 0;
    const hints: MapResponsePathHints = new Map();


    function setOverallCachePolicyWhenUnset() {
      if (!requestContext.overallCachePolicy) {
        requestContext.overallCachePolicy = computeOverallCachePolicy(hints);
      }
    }

    return {
      executionDidStart: () => ({
        executionDidEnd: () => setOverallCachePolicyWhenUnset(),
        willResolveField({ info }) {
          let hint: CacheHint = {};

          // If this field's resolver returns an object or interface, look for
          // hints on that return type.
          const targetType = getNamedType(info.returnType);
          if (
            targetType instanceof GraphQLObjectType ||
            targetType instanceof GraphQLInterfaceType
          ) {
            if (targetType.astNode) {
              hint = mergeHints(
                hint,
                cacheHintFromDirectives(targetType.astNode.directives),
              );
            }
          }

          // Look for hints on the field itself (on its parent type), taking
          // precedence over previously calculated hints.
          const fieldDef = info.parentType.getFields()[info.fieldName];
          if (fieldDef.astNode) {
            hint = mergeHints(
              hint,
              cacheHintFromDirectives(fieldDef.astNode.directives),
            );
          }

          // If this resolver returns an object or is a root field and we haven't
          // seen an explicit maxAge hint, set the maxAge to 0 (uncached) or the
          // default if specified in the constructor. (Non-object fields by
          // default are assumed to inherit their cacheability from their parents.
          // But on the other hand, while root non-object fields can get explicit
          // hints from their definition on the Query/Mutation object, if that
          // doesn't exist then there's no parent field that would assign the
          // default maxAge, so we do it here.)
          if (
            (targetType instanceof GraphQLObjectType ||
              targetType instanceof GraphQLInterfaceType ||
              !info.path.prev) &&
            hint.maxAge === undefined
          ) {
            hint.maxAge = defaultMaxAge;
          }

          if (hint.maxAge !== undefined || hint.scope !== undefined) {
            addHint(hints, info.path, hint);
          }

          info.cacheControl = {
            setCacheHint: (hint: CacheHint) => {
              addHint(hints, info.path, hint);
            },
            cacheHint: hint,
          };
        },
      }),

      responseForOperation() {
        // We are not supplying an answer, we are only setting the cache
        // policy if it's not set! Therefore, we return null.
        setOverallCachePolicyWhenUnset();
        return null;
      },

      willSendResponse(requestContext) {
        const {
          response,
          overallCachePolicy: overallCachePolicyOverride,
        } = requestContext;

        // If there are any errors, we don't consider this cacheable.
        if (response.errors) {
          return;
        }

        // Use the override by default, but if it's not overridden, set our
        // own computation onto the `requestContext` for other plugins to read.
        const overallCachePolicy =
          overallCachePolicyOverride ||
          (requestContext.overallCachePolicy =
            computeOverallCachePolicy(hints));

        if (
          overallCachePolicy &&
          options.calculateHttpHeaders &&
          response.http
        ) {
          if (overallCachePolicy.staleWhileRevalidate) { // FORK
            response.http.headers.set(
              'Cache-Control',
              `max-age=${
                overallCachePolicy.maxAge
              }, stale-while-revalidate=${
                overallCachePolicy.staleWhileRevalidate
              }, ${overallCachePolicy.scope.toLowerCase()}`,
            );
          } else {
            response.http.headers.set(
              'Cache-Control',
              `max-age=${
                overallCachePolicy.maxAge
              }, ${overallCachePolicy.scope.toLowerCase()}`,
            );
          }
        }

        // We should have to explicitly ask to leave the formatted extension in,
        // or pass the old-school `cacheControl: true` (as interpreted by
        // apollo-server-core/ApolloServer), in order to include the
        // old engineproxy-aimed extensions. Specifically, we want users of
        // apollo-server-plugin-response-cache to be able to specify
        // `cacheControl: {defaultMaxAge: 600}` without accidentally turning on
        // the extension formatting.
        if (options.stripFormattedExtensions !== false) return;

        const extensions =
          response.extensions || (response.extensions = Object.create(null));

        if (typeof extensions.cacheControl !== 'undefined') {
          throw new Error("The cacheControl information already existed.");
        }

        extensions.cacheControl = {
          version: 1,
          hints: Array.from(hints).map(([path, hint]) => ({
            path: [...responsePathAsArray(path)],
            ...hint,
          })),
        };
      }
    }
  }
});

function cacheHintFromDirectives(
  directives: ReadonlyArray<DirectiveNode> | undefined,
): CacheHint | undefined {
  if (!directives) return undefined;

  const cacheControlDirective = directives.find(
    directive => directive.name.value === 'cacheControl',
  );
  if (!cacheControlDirective) return undefined;

  if (!cacheControlDirective.arguments) return undefined;

  const maxAgeArgument = cacheControlDirective.arguments.find(
    argument => argument.name.value === 'maxAge',
  );
  const staleWhileRevalidateArgument = cacheControlDirective.arguments.find( // FORK
    argument => argument.name.value === 'staleWhileRevalidate',
  );
  const scopeArgument = cacheControlDirective.arguments.find(
    argument => argument.name.value === 'scope',
  );

  // TODO: Add proper typechecking of arguments
  return {
    maxAge:
      maxAgeArgument &&
      maxAgeArgument.value &&
      maxAgeArgument.value.kind === 'IntValue'
        ? parseInt(maxAgeArgument.value.value)
        : undefined,
    staleWhileRevalidate:
      staleWhileRevalidateArgument &&
      staleWhileRevalidateArgument.value &&
      staleWhileRevalidateArgument.value.kind === 'IntValue'
        ? parseInt(staleWhileRevalidateArgument.value.value)
        : undefined,
    scope:
      scopeArgument &&
      scopeArgument.value &&
      scopeArgument.value.kind === 'EnumValue'
        ? (scopeArgument.value.value as CacheScope)
        : undefined,
  };
}

function mergeHints(
  hint: CacheHint,
  otherHint: CacheHint | undefined,
): CacheHint {
  if (!otherHint) return hint;

  return {
    maxAge: otherHint.maxAge !== undefined ? otherHint.maxAge : hint.maxAge,
    staleWhileRevalidate: otherHint.staleWhileRevalidate !== undefined ? otherHint.staleWhileRevalidate : hint.staleWhileRevalidate, // FORK
    scope: otherHint.scope || hint.scope,
  };
}

function computeOverallCachePolicy(
  hints: MapResponsePathHints,
): Required<CacheHint> | undefined {
  let lowestMaxAge: number | undefined = undefined;
  let lowestMaxAgePlusSWR: number | undefined = undefined; // FORK
  let scope: CacheScope = CacheScope.Public;

  for (const hint of hints.values()) {
    if (hint.maxAge !== undefined) {
      lowestMaxAge =
        lowestMaxAge !== undefined
          ? Math.min(lowestMaxAge, hint.maxAge)
          : hint.maxAge;

      // FORK
      //
      // SWR is defined as the amount of time _after_ max-age when we should
      // treat a resource as no longer fresh, but not _entirely_ stale.
      //
      // So, to merge, we want to know the time when our first resource becomes
      // non-fresh, and then time when our first resource becomes too stale to
      // serve at all. The first value is the min max-age across our hints, and
      // the second value is the min max-age-plus-SWR across our hints. So,
      // that sum is what we actually compute and compare when looping here -
      // and then we subtract the final max-age off of the final
      // max-age-plus-SWR to get the SWR for our HTTP header!
      //
      // If SWR is not specified, we treat it as 0: the resource can be served
      // for zero additional seconds!
      //
      // Note that we skip processing staleWhileRevalidate if maxAge is not
      // also specified. TODO: Type check this, and/or louder error?
      const maxAgePlusSWR = hint.maxAge + (hint.staleWhileRevalidate || 0);
      lowestMaxAgePlusSWR =
        lowestMaxAgePlusSWR !== undefined
          ? Math.min(lowestMaxAgePlusSWR, maxAgePlusSWR)
          : maxAgePlusSWR;
    }

    if (hint.scope === CacheScope.Private) {
      scope = CacheScope.Private;
    }
  }

  // If maxAge is 0, then we consider it uncacheable so it doesn't matter what
  // the scope was.
  return lowestMaxAge && lowestMaxAgePlusSWR // FORK
    ? {
        maxAge: lowestMaxAge,
        staleWhileRevalidate: lowestMaxAgePlusSWR - lowestMaxAge, // FORK
        scope,
      }
    : undefined;
}

function addHint(hints: MapResponsePathHints, path: ResponsePath, hint: CacheHint) {
  const existingCacheHint = hints.get(path);
  if (existingCacheHint) {
    hints.set(path, mergeHints(existingCacheHint, hint));
  } else {
    hints.set(path, hint);
  }
}

export const __testing__ = {
  addHint,
  computeOverallCachePolicy,
};
