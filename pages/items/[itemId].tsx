import ItemSearchPageToolbar from "../../src/app/components/ItemSearchPageToolbar";
import ItemPage from "../../src/app/ItemPage";
import PageLayout from "../../src/app/PageLayout";
import type { NextPageWithLayout } from "../_app";

const ItemPageWrapper: NextPageWithLayout = () => {
  return <ItemPage />;
};

ItemPageWrapper.renderWithLayout = (children) => {
  return (
    <PageLayout>
      <ItemSearchPageToolbar marginBottom="8" />
      {children}
    </PageLayout>
  );
};

export default ItemPageWrapper;
