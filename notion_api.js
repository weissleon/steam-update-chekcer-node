require("dotenv").config();
const NOTION_DB_URL = `https://api.notion.com/v1/databases/${process.env.URL_DB_APP_INFO}`;
const NOTION_PAGE_URL = `https://api.notion.com/v1/pages`;
const { default: axios } = require("axios");
const { default: axiosRetry } = require("axios-retry");
axiosRetry(axios, { retries: 3 });
const https = require("https");
const crypto = require("crypto");

const queryNotionDB = async (payload = {}) => {
  let hasMore = true;
  let nextCursor = undefined;
  const result = [];

  while (hasMore) {
    const response = await axios.post(
      `${NOTION_DB_URL}/query`,
      { ...payload, start_cursor: nextCursor },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({
          secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        }),
      }
    );

    result.push(...response.data.results);
    hasMore = response.data.has_more;
    nextCursor = response.data.next_cursor;
  }

  return result;
};

const querySingleAppInfo = async (steamAppId) => {
  const response = await axios.post(
    `${NOTION_DB_URL}/query`,
    {
      filter: {
        or: [
          {
            property: "steam_app_id",
            rich_text: {
              equals: `${steamAppId}`,
            },
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
    }
  );
  return response.data.results;
};

const getAppInfo = async () => {
  const results = await queryNotionDB();
  const appDataList = results.map((result) => {
    const {
      steam_app_id,
      stove_app_id,
      title,
      base_price,
      steam_discount_rate,
      stove_discount_rate,
      build_id,
      build_last_updated,
    } = result.properties;
    const data = {
      id: result.id,
      steam_app_id: steam_app_id["rich_text"][0]["plain_text"],
      stove_app_id: stove_app_id["rich_text"][0]["plain_text"],
      appName: title["title"][0]["plain_text"],
      base_price: base_price["rich_text"][0]["plain_text"],
      build_id: build_id["rich_text"][0]["plain_text"],
      build_last_updated: build_last_updated["rich_text"][0]["plain_text"],
      steam_discount_rate: steam_discount_rate["rich_text"][0]["plain_text"],
      stove_discount_rate: stove_discount_rate["rich_text"][0]["plain_text"],
    };
    return data;
  });

  return appDataList;
};

const updateAppInfoFor = async (pageId, properties = {}) => {
  const payload = {
    properties: {
      steam_discount_rate: {
        rich_text: [
          { text: { content: properties.steam_discount_rate || "0" } },
        ],
      },
      stove_discount_rate: {
        rich_text: [
          { text: { content: properties.stove_discount_rate || "0" } },
        ],
      },
      build_id: {
        rich_text: [{ text: { content: properties.build_id || "0" } }],
      },
      build_last_updated: {
        rich_text: [
          { text: { content: properties.build_last_updated || "0" } },
        ],
      },
    },
  };

  const response = await axios.patch(
    `${NOTION_PAGE_URL}/${pageId}`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
    }
  );

  return response.status === 200;
};

const addNewApp = async ({
  appName,
  steamAppId,
  stoveAppId,
  basePrice,
  steam_discount_rate,
  stove_discount_rate,
  build_id,
  build_last_updated,
}) => {
  const payload = {
    parent: {
      database_id: process.env.URL_DB_APP_INFO,
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: appName,
            },
          },
        ],
      },
      steam_app_id: {
        rich_text: [
          {
            text: {
              content: `${steamAppId}`,
            },
          },
        ],
      },
      stove_app_id: {
        rich_text: [
          {
            text: {
              content: `${stoveAppId}`,
            },
          },
        ],
      },
      steam_discount_rate: {
        rich_text: [
          {
            text: {
              content: `${steam_discount_rate}`,
            },
          },
        ],
      },
      stove_discount_rate: {
        rich_text: [
          {
            text: {
              content: `${stove_discount_rate}`,
            },
          },
        ],
      },
      build_id: {
        rich_text: [
          {
            text: {
              content: `${build_id}` || "0",
            },
          },
        ],
      },
      build_last_updated: {
        rich_text: [
          {
            text: {
              content: `${build_last_updated}` || "0",
            },
          },
        ],
      },
      base_price: {
        rich_text: [
          {
            text: {
              content: `${basePrice}` || "0",
            },
          },
        ],
      },
    },
  };

  const response = await axios.post(
    `https://api.notion.com/v1/pages`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
    }
  );

  const { id, properties } = response.data;

  const data = {
    id: id,
    appName: properties["title"]["title"][0]["plain_text"],
    steam_app_id: properties["steam_app_id"]["rich_text"][0]["plain_text"],
    stove_app_id: properties["stove_app_id"]["rich_text"][0]["plain_text"],
    build_id: properties["build_id"]["rich_text"][0]["plain_text"],
    build_last_updated:
      properties["build_last_updated"]["rich_text"][0]["plain_text"],
    base_price: properties["base_price"]["rich_text"][0]["plain_text"],
    steam_discount_rate:
      properties["steam_discount_rate"]["rich_text"][0]["plain_text"],
    stove_discount_rate:
      properties["stove_discount_rate"]["rich_text"][0]["plain_text"],
  };

  return data;
};

const addLog = async (logData) => {
  const payload = {
    parent: {
      database_id: process.env.URL_DB_EVENT_LOG,
    },
    properties: {
      log: {
        title: [
          {
            text: {
              content: logData,
            },
          },
        ],
      },
    },
  };

  const response = await axios.post(
    `https://api.notion.com/v1/pages`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
    }
  );

  const { id, properties } = response.data;

  const data = {
    id: id,
    log: properties["log"]["title"][0]["plain_text"],
  };

  return data;
};

module.exports = {
  getAppInfo,
  addLog,
  addNewApp,
  updateAppInfoFor,
  querySingleAppInfo,
};
