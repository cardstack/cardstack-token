const { CST_NAME } = require("../../lib/constants");
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
  { name: "file", alias: "f", type: String },
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
      name: "file",
      alias: "f",
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

  if (!options.file || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let { file, concurrency } = options;

  concurrency = concurrency || 100;

  let addressStr = fs.readFileSync(file);
  let rows = _.compact(addressStr.toString().split("\n"));

  console.log(`Scheduling ${rows.length} buyers to be added to the CST contract ${cst.address}.`);

  let counter = 0;
  try {
    await Parallel.each(rows, async row => {
      let count = ++counter;
      if (count % concurrency === 0) {
        console.log(`Processing ${count} of ${rows.length}, ${Math.round((count / rows.length) * 100)}% complete...`);
      }

      let [ address, holdCap ] = row.split(",");

      if (holdCap && holdCap.trim()) {
        await cst.setCustomBuyer(address.trim(), parseInt(holdCap, 10));
      } else {
        await cst.addBuyer(address.trim());
      }
    }, concurrency);

    console.log("done.");
  } catch (err) {
    console.error(`Error encountered adding buyer, ${err.message}`);
  }

  callback();
};
