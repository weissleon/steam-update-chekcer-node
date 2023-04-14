const { checkIfAppExist } = require("./handler");

const run = async () => {
  const data = await checkIfAppExist(`${1899950}`);
  console.log(data);
};

run();
