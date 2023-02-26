const puppeteer = require("puppeteer");
// const puppeteer = require("puppeteer-extra");
// const StealhPlugin = require("puppeteer-extra-plugin-stealth");
// puppeteer.use(StealhPlugin());
// const { executablePath } = require("puppeteer");
const { default: axios } = require("axios");
const path = require("path");
const URL_STEAM_SALES = "https://steamdb.info/sales/";

const updateSalesList = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    // executablePath: executablePath(),
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
  );
  await page.setCookie(
    {
      domain: ".steamdb.info",
      path: "/",
      name: "__cf_bm",
      value:
        "FkJDmah9ZZ1i7WIsDJsriPMu9USl_enbEISpBJmtzT4-1677388386-0-AVCXZmZSyidt94bMlRjb0yh9g7L1Ld/MwNnyKgCARBvvgLZvk8qTVoFv+21XKqbio4jnrYlpSk45ZfpX2yz9KAj65HLkbXZR7fl6HNESMo9S5uOricItqBgg4odsfABrUc8Oe5/GBafzIi29/1F6mhoTP2ODJWhpLwWRtq5bG4EoMZx35JcAEjiCGNvs+cHS7w==",
    },
    {
      domain: ".steamdb.info",
      path: "/",
      name: "cf_clearance",
      value: "6TbOHv4d9gi6Pm3nRK5kWGc25WUffR74LUcrO0LMDQA-1677388385-0-160",
    }
  );
  await page.goto(URL_STEAM_SALES, { waitUntil: "networkidle0" });

  await page.select("#DataTables_Table_0_length > label > select", "-1");

  await page.waitForNetworkIdle();

  await page.screenshot({ fullPage: true, path: "./screenshot.png" });

  const content = await page.$$eval("tr.app", (rows) => {
    const dataTags = [
      "discount",
      "price",
      "rating",
      "endsIn",
      "started",
      "release",
    ];
    return rows.map((row) => {
      const appId = row.getAttribute("data-appid");
      const tableData = row.querySelectorAll("td");
      const data = {};
      data["appId"] = appId;
      tableData.forEach((datum, key) => {
        if (key < 3) return;
        data[dataTags[key - 3]] = datum.getAttribute("data-sort");
      });
      return data;
    });
  });

  await browser.close();

  return content;
};

const run = async () => {
  const content = await updateSalesList();

  const checkList = ["1972440"];

  console.log(content);
  const result = content.filter((info) => checkList.includes(info["appId"]));
  console.log(result);
};

run();
