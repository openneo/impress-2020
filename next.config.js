module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/outfits/:id/:size(150|300|600).png",
        destination: "/api/outfitImage?size=:size&id=:id",
      },
      {
        source: "/outfits/:id/v/:updatedAt/:size(150|300|600).png",
        destination: "/api/outfitImage?size=:size&id=:id&updatedAt=:updatedAt",
      },
      {
        source: "/asset-images/:type/:x1/:x2/:x3/:remoteId/:idealSize.png",
        destination:
          "/api/assetImageRedirect?idealSize=:idealSize&type=:type&remoteId=:remoteId",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/user/:userId/closet",
        destination: "/user/:userId/lists",
        permanent: true,
      },
      {
        source: "/user/:userId/items",
        destination: "/user/:userId/lists",
        permanent: true,
      },
    ];
  },
};
