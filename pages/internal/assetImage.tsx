import InternalAssetImagePage from "../../src/app/InternalAssetImagePage";
import type { NextPageWithLayout } from "../_app";

const InternalAssetImagePageWrapper: NextPageWithLayout = () => {
  return <InternalAssetImagePage />;
};

InternalAssetImagePageWrapper.renderWithLayout = (children: JSX.Element) =>
  children;

export default InternalAssetImagePageWrapper;
