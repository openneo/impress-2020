module.exports = {
  env: {
    PUBLIC_URL: "",
  },
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
