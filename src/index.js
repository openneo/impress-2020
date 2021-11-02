import React from "react";
import App from "./app/App";

export default function NextIndexWrapper() {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
