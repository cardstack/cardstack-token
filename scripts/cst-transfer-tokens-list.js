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
    header: "cst-transfer-tokens-list",
    content: "This script transfers tokens to a list of ethereum addresses and their transfer amounts (expressed in ETH--we do the math to figure out the corresponding amount of CARD)"
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

  console.log(`Scheduling ${rows.length} addresses to recieve transferred tokens from the address ${process.env.WALLET} for the CST contract ${cst.address}.`);

  let counter = 0;
  await Parallel.each(rows, async row => {
    let count = ++counter;
    if (count % concurrency === 0) {
      console.log(`Processing ${count} of ${rows.length}, ${Math.round((count / rows.length) * 100)}% complete...`);
    }

    let [ address, amountEth ] = row.replace(/"/g, "").split(",");

    if (address && amountEth && amountEth.trim()) {
        let amountWei = web3.toWei(parseInt(amountEth.trim()), 'ether');
        let amountCard = Math.floor(amountWei / buyPriceWei.toNumber()); // we floor fractional tokens in buy function, so floor them here too
      try {
        await cst.transfer(address, amountCard);
      } catch (err) {
        console.error(`Error encountered transferring tokens ${address}, ${err.message}`);
      }
    }
  }, concurrency);

  console.log("done.");
};
