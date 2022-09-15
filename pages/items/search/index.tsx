import ItemSearchPageToolbar from "../../../src/app/components/ItemSearchPageToolbar";
import ItemSearchPage from "../../../src/app/ItemSearchPage";
import PageLayout from "../../../src/app/PageLayout";
import type { NextPageWithLayout } from "../../_app";

const ItemSearchPageWrapper: NextPageWithLayout = () => {
  return <ItemSearchPage />;
};

ItemSearchPageWrapper.layoutComponent = ({ children }) => {
  return (
    <PageLayout>
      <ItemSearchPageToolbar marginBottom="6" />
      {children}
    </PageLayout>
  );
};

export default ItemSearchPageWrapper;
