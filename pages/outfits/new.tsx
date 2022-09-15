import WardrobePage from "../../src/app/WardrobePage";
import type { NextPageWithLayout } from "../_app";

const WardrobePageWrapper: NextPageWithLayout = () => {
  return <WardrobePage />;
};

WardrobePageWrapper.renderWithLayout = (children) => children;

export default WardrobePageWrapper;
