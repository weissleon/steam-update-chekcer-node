const { getAllAppInfo, recordLog } = require("./handler");
const { updateAppInfoFor } = require("./notion_api");
const { getDiscountInfoFor, getBuildInfoFor } = require("./steam_api");
const { getDiscountRate } = require("./stove_api");
const cliProgress = require("cli-progress");

const { default: axios } = require("axios");

const run = async () => {
  // 1. 일단 Notion에서 등록된 모든 앱 정보 로드
  const appList = await getAllAppInfo();
  /* id: any;
    appName: any;
    steam_app_id: any;
    stove_app_id: any;
    build_id: any;
    build_last_updated: any;
    base_price: any;
    steam_discount_rate: any;
    stove_discount_rate: any;
    */
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  let discountChangeList = [];
  let diffList = [];
  let buildChangeList = [];
  const changedAppList = new Map();

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(appList.length, 0);
  for (let i = 0; i < appList.length; i++) {
    bar.increment();
    const app = appList[i];
    console.log(app.appName);
    const { discount_rate: steam_discount_rate } = await getDiscountInfoFor(
      app.steam_app_id
    );
    const stove_discount_rate = await getDiscountRate(page, app.stove_app_id);

    const {
      build_id: new_build_id,
      build_last_updated: new_build_last_updated,
    } = await getBuildInfoFor(app.steam_app_id);

    // 할인 중이면 in
    // 할인 끝났어도 in
    if (
      `${steam_discount_rate}` !== "0" ||
      (`${steam_discount_rate}` === "0" && `${app.steam_discount_rate}` !== "0")
    ) {
      discountChangeList.push({
        isNew: steam_discount_rate !== app.steam_discount_rate,
        id: app.id,
        appName: app.appName,
        steam_app_id: app.steam_app_id,
        rate: `${steam_discount_rate}`,
      });
      if (!changedAppList.has(app.id))
        changedAppList.set(app.id, { ...app, steam_discount_rate });
      else changedAppList.get(app.id).steam_discount_rate = steam_discount_rate;
    }

    // 스토브 할인 바뀌면
    if (`${app.stove_discount_rate}` !== `${stove_discount_rate}`) {
      if (!changedAppList.has(app.id))
        changedAppList.set(app.id, { ...app, stove_discount_rate });
      else changedAppList.get(app.id).stove_discount_rate = stove_discount_rate;
    }

    // 할인률 다르면 in
    if (
      `${steam_discount_rate}` !== `${stove_discount_rate}` ||
      (`${steam_discount_rate}` !== "0" &&
        `${steam_discount_rate}` === `${stove_discount_rate}`)
    ) {
      diffList.push({
        isNew: steam_discount_rate !== app.steam_discount_rate,
        id: app.id,
        steam_app_id: app.steam_app_id,
        appName: app.appName,
        steam_discount_rate: `${steam_discount_rate}`,
        stove_discount_rate: `${stove_discount_rate}`,
      });
    }

    // 빌드번호 다르면 in
    if (`${app.build_id}` !== `${new_build_id}`) {
      buildChangeList.push({
        id: app.id,
        appName: app.appName,
        steam_app_id: app.steam_app_id,
        build_id: new_build_id,
        build_last_updated: new_build_last_updated,
      });
      if (!changedAppList.has(app.id)) {
        changedAppList.set(app.id, {
          ...app,
          build_id: new_build_id,
          build_last_updated: new_build_last_updated,
        });
      } else {
        changedAppList.get(app.id).build_id = new_build_id;
        changedAppList.get(app.id).build_last_updated = new_build_last_updated;
      }
    }
  }
  bar.stop();
  browser.close();

  // console.log(discountChangeList);
  // console.log(diffList);
  // console.log(buildChangeList);
  // console.log(changedAppList);

  // 할인 정보 loop해서 LOG작성

  for (let i = 0; i < discountChangeList.length; i++) {
    const app = discountChangeList[i];
    await recordLog(
      "DISCOUNT",
      `APP_ID:${app.steam_app_id};STEAM_RATE:${app.rate}`
    );
  }
  // 빌드 정도 loop해서 LOG작성
  for (let i = 0; i < buildChangeList.length; i++) {
    const app = buildChangeList[i];
    await recordLog(
      "BUILD",
      `APP_ID:${app.steam_app_id};BUILD_ID:${app.build_id};TIME_UPDATED:${app.build_last_updated}`
    );
  }

  console.log("Registering to DB");
  // DB에 등록하기
  for (const [key, app] of changedAppList) {
    await updateAppInfoFor(app.id, {
      steam_discount_rate: app.steam_discount_rate,
      stove_discount_rate: app.stove_discount_rate,
      build_id: app.build_id,
      build_last_updated: app.build_last_updated,
    });
  }

  const currentTime = new Date();
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const date = currentTime.getDate();
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();

  let message = "안녕하세요, 스팀 알리미입니다. :la_hello:\n";
  message += `### ${year}년${month.toString().padStart(2, "0")}월${date
    .toString()
    .padStart(2, "0")}일 ${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")} 기준 업데이트 :la_best:\n`;

  message +=
    "```\n- 😁 : only 스토브\n- 😜 : 스팀 < 스토브\n- 🥶 : 스팀 > 스토브\n- 🤬 : only 스팀\n- 🤗 : 스토브 = 스팀```\n";

  message += ":sg_ohno: *[스팀 vs 스토브 할인 비교]*\n```\n";

  diffList = diffList.sort((a, b) => a.appName.localeCompare(b.appName));
  for (let i = 0; i < diffList.length; i++) {
    const app = diffList[i];
    const newIcon = app.isNew ? "🆕" : "";
    let statusIcon = "🥶";

    if (
      Number.parseInt(app.steam_discount_rate) <
        Number.parseInt(app.stove_discount_rate) &&
      Number.parseInt(app.stove_discount_rate) !== 0
    )
      statusIcon = "😜";

    if (
      Number.parseInt(app.steam_discount_rate) > 0 &&
      Number.parseInt(app.stove_discount_rate) === 0
    )
      statusIcon = "🤬";
    if (
      Number.parseInt(app.steam_discount_rate) === 0 &&
      Number.parseInt(app.stove_discount_rate) > 0
    )
      statusIcon = "😁";
    if (
      Number.parseInt(app.stove_discount_rate) !== 0 &&
      Number.parseInt(app.stove_discount_rate) ===
        Number.parseInt(app.steam_discount_rate)
    )
      statusIcon = "🤗";

    const title = `${(i + 1).toString().padStart(3, "0")} ${statusIcon} [${
      app.appName
    }]`;
    message += `${title} 스팀: ${app.steam_discount_rate}% 스토브: ${
      app.stove_discount_rate
    }% ${newIcon}${i !== diffList.length - 1 ? "\n" : ""}`;
  }
  if (diffList.length === 0) message += "없음.";

  message += "\n```";

  message += "\n:sg_smashmonitor: *[스팀 빌드 업데이트]*\n```\n";

  buildChangeList = buildChangeList.sort((a, b) =>
    a.appName.localeCompare(b.appName)
  );
  for (let i = 0; i < buildChangeList.length; i++) {
    const app = buildChangeList[i];

    const updateTime = new Date(parseInt(app.build_last_updated) * 1000);
    const year = updateTime.getFullYear();
    const month = updateTime.getMonth() + 1;
    const date = updateTime.getDate();
    const hour = updateTime.getHours();
    const minute = updateTime.getMinutes();
    const time = `${year}-${month.toString().padStart(2, "0")}-${date
      .toString()
      .padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
    const title = `${i + 1}. ${app.appName}:`;
    message += `${title} ${time}에 업데이트됨${
      i !== buildChangeList.length - 1 ? "\n" : ""
    }`;
  }
  if (buildChangeList.length === 0) message += "없음.";

  message += "\n```";

  console.log(message);
  await axios.post(
    process.env.URL_SMILEHUB_WEBHOOK,
    JSON.stringify({ text: message }),
    { headers: { "Content-Type": "application/json" } }
  );

  // 2. 게임별로 할인 정보와 빌드 정보를 불러오기
  // 만약
  // 2-2. 혹여나
  // LOG도 작성해야 한다.
  // 마스터 데이터는 가지고 있되 (캐싱 용도)
  // 다른 데이터는 event 방식으로 축적되게 만들어야 한다.
};

run();
