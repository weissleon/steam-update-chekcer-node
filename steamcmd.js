const spawn = require("child_process").spawn;

const prc = spawn("./bin/steamcmd/steamcmd.exe");

const login = (account, password) => {};

prc.stdout.setEncoding("utf8");
let count = 1;
prc.stdout.on("data", (data) => {
  const str = data.toString();
  console.log(str, `Count: ${count}`);
  count++;
  if (str.match(/Loading Steam API...OK/g)) console.log("Ready!");
});

prc.on("close", (code) => {
  console.log("process exit code " + code);
});
