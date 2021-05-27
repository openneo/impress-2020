import beeline from "honeycomb-beeline";

const beelinePlugin = {
  requestDidStart() {
    const trace = beeline.startTrace();
    return {
      didResolveOperation({ operationName }) {
        beeline.addContext({
          name: operationName,
          operation_name: operationName,
        });
        beeline.addTraceContext({
          operation_name: operationName,
        });
      },
      willSendResponse() {
        beeline.finishTrace(trace);
      },
    };
  },
};

module.exports = {
  beelinePlugin,
};
