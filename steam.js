const { default: axios } = require("axios");

const updateInfoFor = async (pageId, type, properties = {}) => {
  const payload =
    type === "discount"
      ? {
          properties: {
            discount_percent: {
              rich_text: [
                { text: { content: properties.discount_percent || "0" } },
              ],
            },
          },
        }
      : {
          properties: {
            build_id: {
              rich_text: [{ text: { content: properties.build_id || "0" } }],
            },
            time_updated: {
              rich_text: [
                { text: { content: properties.time_updated || "0" } },
              ],
            },
          },
        };

  const response = await axios.patch(
    `https://api.notion.com/v1/pages/${pageId}`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  return response.status === 200;
};

const createDBRowFor = async (appId, type, info = {}) => {
  const payloadForDiscount = {
    parent: {
      database_id: process.env.URL_DB_DISCOUNT_STATUS,
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: info.title || "New Title",
            },
          },
        ],
      },
      app_id: {
        rich_text: [
          {
            text: {
              content: appId,
            },
          },
        ],
      },
      discount_percent: {
        rich_text: [
          {
            text: {
              content: info.discount_percent || "0",
            },
          },
        ],
      },
    },
  };

  const payloadForBuild = {
    parent: {
      database_id: process.env.URL_DB_BUILD_STATUS,
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: info.title || "New Title",
            },
          },
        ],
      },
      app_id: {
        rich_text: [
          {
            text: {
              content: appId,
            },
          },
        ],
      },
      build_id: {
        rich_text: [
          {
            text: {
              content: info.build_id || "0",
            },
          },
        ],
      },
      time_updated: {
        rich_text: [
          {
            text: {
              content: info.time_updated || "0",
            },
          },
        ],
      },
    },
  };

  const payload = type === "discount" ? payloadForDiscount : payloadForBuild;

  const response = await axios.post(
    `https://api.notion.com/v1/pages`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const { id, properties } = response.data;

  const data =
    type === "discount"
      ? {
          id: id,
          title: properties["title"]["title"][0]["plain_text"],
          app_id: properties["app_id"]["rich_text"][0]["plain_text"],
          discount_percent:
            properties["discount_percent"]["rich_text"][0]["plain_text"],
        }
      : {
          id: id,
          title: properties["title"]["title"][0]["plain_text"],
          app_id: properties["app_id"]["rich_text"][0]["plain_text"],
          build_id: properties["build_id"]["rich_text"][0]["plain_text"],
          time_updated:
            properties["time_updated"]["rich_text"][0]["plain_text"],
        };

  return data;
};

const getLatestAppBuildInfoFor = async (appId) => {
  const response = await axios.get(
    `https://api.steamcmd.net/v1/info/${appId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    }
  );
  const { buildid: buildId, timeupdated: timeUpdated } =
    response.data["data"][appId]["depots"]["branches"]["public"];

  const data = { app_id: appId, build_id: buildId, time_updated: timeUpdated };

  return data;
};

const getDiscountInfoFor = async (appId) => {
  const response = await axios.get(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    }
  );
  const discountPercent =
    response.data[appId]["data"]["price_overview"]["discount_percent"];

  const data = {
    app_id: `${appId}`,
    discount_percent: `${discountPercent}`,
  };
  return data;
};

const checkEntryExistFor = async (appId, type) => {
  const dbUrl =
    type.toLowerCase() === "discount"
      ? process.env.URL_DB_DISCOUNT_STATUS
      : process.env.URL_DB_BUILD_STATUS;
  const response = await axios.post(
    `https://api.notion.com/v1/databases/${dbUrl}/query`,
    JSON.stringify({
      filter: {
        or: [{ property: "app_id", rich_text: { equals: appId } }],
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const { results } = response.data;

  if (results.length === 0) return { exist: false, data: null };

  const { app_id, title } = results[0].properties;
  const data =
    type === "discount"
      ? {
          id: results[0].id,
          title: title["title"][0]["plain_text"],
          app_id: app_id["rich_text"][0]["plain_text"],
          discount_percent:
            results[0].properties["discount_percent"]["rich_text"][0][
              "plain_text"
            ],
        }
      : {
          id: results[0].id,
          title: title["title"][0]["plain_text"],
          app_id: app_id["rich_text"][0]["plain_text"],
          build_id:
            results[0].properties["build_id"]["rich_text"][0]["plain_text"],
          time_updated:
            results[0].properties["time_updated"]["rich_text"][0]["plain_text"],
        };
  return { exist: true, data: data };

  // return response.data.results.length > 0;
};

const getAppBaseInfo = async () => {
  const response = await axios.post(
    `https://api.notion.com/v1/databases/${process.env.URL_DB_APP_INFO}/query`,
    {},
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const { results } = response.data;

  const apps = results.map((result) => {
    const { app_id, title, base_price } = result.properties;
    const data = {
      id: result.id,
      app_id: app_id["rich_text"][0]["plain_text"],
      title: title["title"][0]["plain_text"],
      base_price: base_price["rich_text"][0]["plain_text"],
    };
    return data;
  });

  return apps;
};

const getAppBuildInfo = async () => {
  const response = await axios.post(
    `https://api.notion.com/v1/databases/${process.env.URL_DB_BUILD_STATUS}/query`,
    {},
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const { results } = response.data;

  const data = results.map((result) => {
    const { app_id, title, build_id, time_updated } = result.properties;
    const data = {
      id: result.id,
      title: title["title"][0]["plain_text"],
      app_id: app_id["rich_text"][0]["plain_text"],
      build_id: build_id["rich_text"][0]["plain_text"],
      time_updated: time_updated["rich_text"][0]["plain_text"],
    };
    return data;
  });

  return data;
};

const getAppDiscountInfo = async () => {
  const response = await axios.post(
    `https://api.notion.com/v1/databases/${process.env.URL_DB_DISCOUNT_STATUS}/query`,
    {},
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const { results } = response.data;

  const data = results.map((result) => {
    const { app_id, title, discount_percent } = result.properties;
    const data = {
      id: result.id,
      title: title["title"][0]["plain_text"],
      app_id: app_id["rich_text"][0]["plain_text"],
      discount_percent: discount_percent["rich_text"][0]["plain_text"],
    };
    return data;
  });

  return data;
};

const run = async () => {
  require("dotenv").config();
  const appBaseInfo = await getAppBaseInfo();

  const updatePromises = [];
  const updateDiscountList = [];
  for (let i = 0; i < appBaseInfo.length; i++) {
    const appId = appBaseInfo[i]["app_id"];
    const title = appBaseInfo[i]["title"];
    const promise = getDiscountInfoFor(appId).then(
      async ({ app_id, discount_percent }) => {
        const { exist, data } = await checkEntryExistFor(app_id, "discount");
        if (exist) {
          if (discount_percent !== data.discount_percent) {
            await updateInfoFor(data.id, "discount", {
              discount_percent,
            });
            updateDiscountList.push(data);
          }
        } else {
          const data = await createDBRowFor(app_id, "discount", {
            title,
            discount_percent,
          });
          updateDiscountList.push(data);
        }
      }
    );
    updatePromises.push(promise);
  }
  await Promise.all(updatePromises);

  const buildPromises = [];
  const updatedBuildList = [];
  for (let i = 0; i < appBaseInfo.length; i++) {
    const appId = appBaseInfo[i]["app_id"];
    const title = appBaseInfo[i]["title"];
    const promise = getLatestAppBuildInfoFor(appId).then(
      async ({ app_id, build_id, time_updated }) => {
        const { exist, data } = await checkEntryExistFor(app_id, "build");
        if (exist) {
          if (data.build_id !== build_id) {
            await updateInfoFor(data.id, "build", {
              build_id: build_id,
              time_updated: time_updated,
            });
            updatedBuildList.push(data);
          }
        } else {
          const data = await createDBRowFor(app_id, "build", {
            title,
            build_id: build_id,
            time_updated: time_updated,
          });
          updatedBuildList.push(data);
        }
      }
    );

    buildPromises.push(promise);
  }
  await Promise.all(buildPromises);

  updateDiscountList.forEach((updatedDiscount) => {
    // Here, the smilehub message will be merged and sent.
  });

  updatedBuildList.forEach((updatedBuild) => {
    // Here, the smilehub message will be merged and sent.
  });
};

run();
