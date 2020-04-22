import React from "react";
import { CSSReset, ThemeProvider, theme } from "@chakra-ui/core";
import WardrobePage from "./WardrobePage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CSSReset />
      <WardrobePage />
    </ThemeProvider>
  );
}

export default App;
