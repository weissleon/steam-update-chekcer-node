const URL_STOVE_INDIE = "https://indie.onstove.com/ko/games/";

const getDiscountRate = async (puppeteerPage, appId) => {
  await puppeteerPage.goto(`${URL_STOVE_INDIE}${appId}`, {
    waitUntil: "networkidle0",
  });

  let discountRate = "0";
  try {
    discountRate = (
      await puppeteerPage.$eval(
        ".price-wrap > span.element-badge",
        (element) => element.textContent
      )
    ).match(/[0-9]+/g)[0];
  } catch (error) {
  } finally {
    return discountRate;
  }
};

module.exports = {
  getDiscountRate,
};
