import DonationsPage from "../src/app/DonationsPage";
// @ts-ignore: doesn't understand module.exports
import connectToDb from "../src/server/db";

type Props = { campaigns: Campaign[] };

type Campaign = {
  id: string;
  name: string;
  donationFeatures: DonationFeature[];
};
type DonationFeature = {
  id: string;
  donorName: string | null;
  outfit: { id: string; name: string; updatedAt: string } | null;
};

export default function DonationsPageWrapper({ campaigns }: Props) {
  return <DonationsPage campaigns={campaigns} />;
}

/**
 * getStaticProps loads the donation info and organizes it into a convenient
 * structure for the page props.
 *
 * This happens at build time! This data basically hasn't changed since 2017,
 * so we'd rather have the performance benefits and reliability of just
 * building it up-front than making this an SSR thing. (It also makes it harder
 * for someone to add a surprise prank message years later when we're not
 * paying attention, by editing the outfit title—it would still probably make
 * it onto the site eventually, but not until the next build, which should be
 * discouraging. But nobody's ever tried to prank this page before, so, shrug!)
 *
 * I also just went with a direct DB query, to avoid putting any of this in our
 * GraphQL schema when it's really super-duper *just* for this page and *just*
 * going to be requested in super-duper *one* way.
 */
export async function getStaticProps() {
  const db = await connectToDb();

  const [rows]: [QueryRow[]] = await db.query({
    sql: `
      SELECT
        donation_features.id,
        donations.donor_name,
        campaigns.id, campaigns.name,
        outfits.id, outfits.name, outfits.updated_at
      FROM donation_features
      INNER JOIN donations ON donations.id = donation_features.donation_id
      INNER JOIN campaigns ON campaigns.id = donations.campaign_id
      LEFT JOIN outfits ON outfits.id = donation_features.outfit_id
      ORDER BY campaigns.created_at DESC, donations.created_at ASC;
    `,
    nestTables: true,
  });

  // Reorganize the query rows into campaign objects with lists of donation
  // features.
  const campaigns: Campaign[] = [];
  for (const row of rows) {
    // Find the campaign for this feature in our campaigns list, or add it if
    // it's not present yet.
    let campaign = campaigns.find((c) => c.id === String(row.campaigns.id));
    if (campaign == null) {
      campaign = {
        id: String(row.campaigns.id),
        name: row.campaigns.name,
        donationFeatures: [],
      };
      campaigns.push(campaign);
    }

    // Reformat the outfit and donation feature into safer and more
    // serializable forms.
    const outfit =
      row.outfits.id != null
        ? {
            id: String(row.outfits.id),
            name: row.outfits.name,
            updatedAt: row.outfits.updated_at.toISOString(),
          }
        : null;
    const donationFeature: DonationFeature = {
      id: String(row.donation_features.id),
      donorName: row.donations.donor_name,
      outfit,
    };

    // Add this donation feature to the campaign.
    campaign.donationFeatures.push(donationFeature);
  }

  return {
    props: { campaigns },
  };
}

type QueryRow = {
  donation_features: { id: number };
  donations: { donor_name: string | null };
  campaigns: { id: string; name: string };
  outfits:
    | { id: number; name: string; updated_at: Date }
    | { id: null; name: null; updated_at: null };
};
