import InternalAssetImagePage from "../../src/app/InternalAssetImagePage";
import type { NextPageWithLayout } from "../_app";

const InternalAssetImagePageWrapper: NextPageWithLayout = () => {
  return <InternalAssetImagePage />;
};

InternalAssetImagePageWrapper.layoutComponent = ({ children }) => {
  return children;
};

export default InternalAssetImagePageWrapper;
