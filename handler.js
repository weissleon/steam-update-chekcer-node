const {
  addLog,
  getAppInfo,
  addNewApp,
  querySingleAppInfo,
} = require("./notion_api");
const {
  getDiscountInfoFor: getSteamDiscountInforFor,
  getBuildInfoFor,
} = require("./steam_api");
const { getDiscountRate: getStoveDiscountInforFor } = require("./stove_api");

const getAllAppInfo = async () => {
  const data = await getAppInfo();
  return data;
};

const recordLog = async (type, content) => {
  const data = await addLog(`${type}: ${content}`);

  return data;
};

const checkIfAppExist = async (steamAppId) => {
  const result = await querySingleAppInfo(steamAppId);

  return result.length > 0;
};

const registerNewApp = async (
  appName = "",
  steamAppId = "0",
  stoveAppId = "0",
  basePrice = "0"
) => {
  // 먼저 steamCmd에 통신해서 buildId 정보를 가져와야 한다.
  const { discount_rate: steam_discount_rate } = await getSteamDiscountInforFor(
    steamAppId
  );
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const stove_discount_rate = await getStoveDiscountInforFor(page, stoveAppId);
  const { build_id, build_last_updated } = await getBuildInfoFor(steamAppId);

  const data = await addNewApp({
    appName,
    steamAppId,
    stoveAppId,
    basePrice,
    steam_discount_rate,
    stove_discount_rate,
    build_id,
    build_last_updated,
  });

  browser.close();
  return data;
};

const registerNewAppInBatch = async (appList) => {
  for (let i = 0; i < appList.length; i++) {
    const app = appList[i];

    const { appName, steamAppId, stoveAppId, basePrice } = app;
    process.stdout.write(`Registering ${appName} (${i + 1}/${appList.length})`);
    const exist = await checkIfAppExist(`${steamAppId}`);
    if (exist) {
      console.log(" Already exist!");
      continue;
    }

    await registerNewApp(
      appName,
      `${steamAppId}`,
      `${stoveAppId}`,
      `${basePrice}`
    );
    console.log(" Registered!");
  }
};

module.exports = {
  getAllAppInfo,
  recordLog,
  registerNewApp,
  checkIfAppExist,
  registerNewAppInBatch,
};
