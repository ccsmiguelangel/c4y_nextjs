export const QUERY_DASHBOARD = {
  populate: {
    favicon: {
      fields: ["url", "alternativeText"],
    },
    sections: {
      on: {
        "layout.hero-section": {
          populate: {
            image: {
              fields: ["url", "alternativeText"],
            },
            link: {
              populate: true,
            },
          },
        },
      },
    },
  },
};