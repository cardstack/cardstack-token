const fs = require("fs");
const _ = require("lodash");

function adjustForDecimals(value, decimals=18) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals + 1, '0'));
  return (new web3.BigNumber(value)).div(decimalsFactor);
}
module.exports = async function(callback) {
  const fileStr = fs.readFileSync('idex_card_ledger.csv');
  const rows = _.compact(fileStr.toString().split("\n"));

  let sum = new web3.BigNumber(0);
  for (let row of rows) {
    let [ , amount ] = row.replace(/"/g, "").split(",");
    sum = sum.add(new web3.BigNumber(amount));
  }

  console.log('raw ledger sum', sum.toPrecision(50).toString().split('.')[0]);
  console.log('raw ledger sum', adjustForDecimals(sum).toPrecision(50).toString());
  callback();
};
