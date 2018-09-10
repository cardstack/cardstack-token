const fs = require("fs");
const _ = require("lodash");

module.exports = async function(callback) {
  const fileStr = fs.readFileSync('mainnet_ledger_20180908_2.csv');
  const rows = _.compact(fileStr.toString().split("\n"));

  let sum = new web3.BigNumber(0);
  for (let row of rows) {
    let [ , amount ] = row.replace(/"/g, "").split(",");
    sum = sum.add(new web3.BigNumber(amount));
  }

  console.log('ledger sum', sum.toPrecision(50).toString().split('.')[0]);
  callback();
};
