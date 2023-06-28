const { default: axios } = require("axios");
const { default: axiosRetry } = require("axios-retry");
axiosRetry(axios, { retries: 3 });
const https = require("https");
const crypto = require("crypto");

const getDiscountInfoFor = async (appId) => {
  const STEAM_API_URL = "https://store.steampowered.com/api/appdetails";

  const response = await axios.get(`${STEAM_API_URL}?appids=${appId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    },
    httpsAgent: new https.Agent({
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      rejectUnauthorized: false,
    }),
  });
  const discountPercent =
    response.data[appId]["data"]["price_overview"] !== undefined
      ? response.data[appId]["data"]["price_overview"]["discount_percent"]
      : "0";

  const data = {
    app_id: `${appId}`,
    discount_rate: `${discountPercent}`,
  };
  return data;
};

const getBuildInfoFor = async (appId) => {
  const response = await axios.get(
    `https://api.steamcmd.net/v1/info/${appId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
      httpsAgent: new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        rejectUnauthorized: false,
      }),
    }
  );
  let fields = null;
  fields = response.data["data"][appId];

  let buildId = "";
  let timeUpdated = "";

  if (fields["depots"] === undefined) {
    buildId =
      response.data["data"][appId]["common"]["steam_deck_compatibility"][
        "tested_build_id"
      ];
    timeUpdated =
      response.data["data"][appId]["common"]["steam_deck_compatibility"][
        "test_timestamp"
      ];
  } else {
    buildId = fields["depots"]["branches"]["public"]["buildid"];
    timeUpdated = fields["depots"]["branches"]["public"]["timeupdated"];
  }

  const data = {
    app_id: appId,
    build_id: buildId,
    build_last_updated: timeUpdated,
  };

  return data;
};

module.exports = {
  getDiscountInfoFor,
  getBuildInfoFor,
};
