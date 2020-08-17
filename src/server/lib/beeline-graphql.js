// Integrates Honeycomb tracing with Apollo Server.
// Adapted from https://gist.github.com/numso/504faeca4e946c2c54e8b890c6469d81
const beeline = require("honeycomb-beeline");
const gql = require("graphql");

export function addBeelineToSchema(schema) {
  if (!beeline) return;
  forEachField(schema, (field) => {
    if (!field.resolve) return;
    const oldResolve = field.resolve;
    field.resolve = (source, args, context, info) => {
      context.spans = context.spans || {};
      let result;
      const path = responsePathAsString(info.path);
      beeline.startAsyncSpan(fieldsFor("resolve", path), async (span) => {
        context.spans[path] = span.payload["trace.span_id"];
        try {
          result = oldResolve(source, args, { ...context, span }, info);
          if (result.then) await result;
        } catch (error) {
          span.addContext({ "error.message": error.message });
          span.addContext({ "error.stacktrace": error.stack });
        }
        const parent = getParentId(context.spans, path);
        if (parent) span.addContext({ "trace.parent_id": parent });
        beeline.finishSpan(span);
      });
      return result;
    };
  });
}

function forEachField(schema, fn) {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach((typeName) => {
    const type = typeMap[typeName];
    if (
      !gql.getNamedType(type).name.startsWith("__") &&
      type instanceof gql.GraphQLObjectType
    ) {
      const fields = type.getFields();
      Object.keys(fields).forEach((fieldName) => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}

const responsePathAsString = (path) => gql.responsePathAsArray(path).join(".");

function getParentId(spanIds, currentPath) {
  const path = currentPath.split(".").slice(0, -1).join(".");
  if (!path) return null;
  if (!(path in spanIds)) {
    const span = beeline.startSpan(fieldsFor("field", path));
    spanIds[path] = span.payload["trace.span_id"];
    const parent = getParentId(spanIds, path);
    if (parent) span.addContext({ "trace.parent_id": parent });
    beeline.finishSpan(span);
  }
  return spanIds[path];
}

const fieldsFor = (name, path) => ({
  name,
  "graphql.path": path,
  "graphql.key": path.split(".").pop(),
});

export const beelinePlugin = {
  requestDidStart() {
    const trace = beeline.startTrace();
    return {
      didResolveOperation({ operationName }) {
        beeline.addContext({
          name: operationName,
          operation_name: operationName,
        });
      },
      willSendResponse() {
        beeline.finishTrace(trace);
      },
    };
  },
};
