const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const fs = require("fs");
const _ = require("lodash");
const Parallel = require("async-parallel");

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "csv", type: String },
  { name: "concurrency", alias: "c", type: Number },
  { name: "registry", alias: "r", type: String },
];

const usage = [
  {
    header: "cst-add-buyer-list",
    content: "This script adds buyers from a list of ethereum addresses to the CST buyers whitelist."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "csv",
      description: "The file containing ethereum addresses (each on a separate line)"
    },{
      name: "concurrency",
      alias: "c",
      description: "(Optional) The number of concurrent transactions to submit to the network at any one time. The default concurrency is 100 simultaneous transactions at a time."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
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
  let buyPriceWei = await cst.buyPrice();

  let { csv, concurrency } = options;

  concurrency = concurrency || 100;

  let fileStr = fs.readFileSync(csv);
  let rows = _.compact(fileStr.toString().split("\n"));

  console.log(`Scheduling ${rows.length} buyers to be added to the CST contract ${cst.address}.`);

  let counter = 0;
  await Parallel.each(rows, async row => {
    let count = ++counter;
    if (count % concurrency === 0) {
      console.log(`Processing ${count} of ${rows.length}, ${Math.round((count / rows.length) * 100)}% complete...`);
    }

    let [ address, holdCapEth ] = row.replace(/"/g, "").split(",");

    if (holdCapEth && holdCapEth.trim()) {
        let holdCapWei = web3.toWei(parseInt(holdCapEth.trim()), 'ether');
        let holdCap = Math.floor(holdCapWei / buyPriceWei.toNumber()); // we floor fractional tokens in buy function, so floor them here too
      try {
        await cst.setCustomBuyer(address.trim(), holdCap);
      } catch (err) {
        if (err.message.indexOf("wasn't processed in 240 seconds") > -1) {
          console.log(`Warning for buyer ${address}: ${err.message}. This is probably ok, but you can confirm transaction in etherscan`);
        } else {
          console.error(`Error encountered adding buyer ${address}, ${err.message}`);
        }
      }
    } else {
      try {
        await cst.addBuyer(address.trim());
      } catch (err) {
        if (err.message.indexOf(/wasn't processed in .* seconds/) > -1) {
          console.log(`Warning for buyer ${address}: ${err.message}. This is probably ok, but you can confirm transaction in etherscan`);
        } else {
          console.error(`Error encountered adding buyer ${address}, ${err.message}`);
        }
      }
    }
  }, concurrency);

  console.log("done.");
};
