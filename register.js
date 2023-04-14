const { getDiscountRate } = require("./stove_api");
const puppeteer = require("puppeteer");
const {
  getAllAppInfo,
  recordLog,
  registerNewApp,
  checkIfAppExist,
  registerNewAppInBatch,
} = require("./handler");
const prompts = require("prompts");
const Xlsx = require("xlsx");

const run = async () => {
  const { action } = await prompts([
    {
      type: "select",
      name: "action",
      message: "How would you like to register the app?",
      choices: [
        { title: "Batch", value: 0 },
        { title: "Single", value: 1 },
      ],
    },
  ]);

  if (action === 0) {
    const { filePath } = await prompts([
      {
        type: "text",
        name: "filePath",
        message: "Please specify the excel file path",
      },
    ]);

    console.log(filePath);

    const result = Xlsx.readFile(filePath);
    const data = Xlsx.utils.sheet_to_json(result.Sheets[result.SheetNames[0]], {
      header: 0,
    });

    await registerNewAppInBatch(data);
  }

  if (action === 1) {
    const { appName, steamAppId, stoveAppId, basePrice } = await prompts([
      { type: "text", name: "appName", message: "App Name:" },
      { type: "text", name: "steamAppId", message: "Steam App Id:" },
      { type: "text", name: "stoveAppId", message: "Stove App Id:" },
      { type: "text", name: "basePrice", message: "Base Price:" },
    ]);

    console.log("Registering...");
    if (await checkIfAppExist(steamAppId)) {
      console.log("App already registered!");
      return;
    }
    const data = await registerNewApp(
      appName,
      steamAppId,
      stoveAppId,
      basePrice
    );
    console.log("Register Complete!");
  }
};

run();
