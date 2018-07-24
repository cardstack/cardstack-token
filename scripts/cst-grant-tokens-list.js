const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const fs = require("fs");
const _ = require("lodash");
const Parallel = require("async-parallel");

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

function displayBigNumber(number) {
  let precision = 50;
  let numberAsString = number.toPrecision(precision).toString();
  let [ result ] = numberAsString.split('.');
  return result;
}
const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "csv", type: String, description: "The file containing ethereum addresses (each on a separate line)" },
  { name: "concurrency", alias: "c", type: Number, description: "(Optional) The number of concurrent transactions to submit to the network at any one time. The default concurrency is 100 simultaneous transactions at a time." },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "cst-grant-tokens-list",
    content: "This script grants tokens to a list of ethereum addresses and their grant amounts (expressed in ETH--we do the math to figure out the corresponding amount of CARD)"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.csv || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);
  let decimals = await cst.decimals();
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));

  let { csv, concurrency } = options;

  concurrency = concurrency || 100;

  let fileStr = fs.readFileSync(csv);
  let rows = _.compact(fileStr.toString().split("\n"));

  console.log(`Scheduling ${rows.length} addresses to be granted tokens for the CST contract ${cst.address}`);

  let counter = 0;
  await Parallel.each(rows, async row => {
    let count = ++counter;
    if (count % concurrency === 0) {
      console.log(`Processing ${count} of ${rows.length}, ${Math.round((count / rows.length) * 100)}% complete...`);
    }

    let [ address, amount ] = row.replace(/"/g, "").split(",");

    if (address && amount && amount.trim()) {
      amount = new web3.BigNumber(amount);
      amount = amount.mul(new web3.BigNumber(decimalsFactor));
      console.log(`Granting ${address} raw token amount ${displayBigNumber(amount)}`);
      try {
        await cst.grantTokens(address, displayBigNumber(amount));
      } catch (err) {
        console.error(`Error encountered granting tokens ${address}, ${err.message}`);
      }
    }
  }, concurrency);

  console.log("done.");
};
