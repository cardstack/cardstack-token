const { CST_NAME } = require("../lib/utils");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "sellCap", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-set-sell-cap",
    content: "This script specifies the maximum number of CST that can be sold."
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
      name: "sellCap",
      description: "The maximum number of CST that can be purchased from the CST contract. (This is used to set the maximum number of CST avialable for each phase of CST purchase.)"
    },{
      name: "registry",
      alias: "r",
      description: "(Optional) The address of the registry. The script will attempt to detect the registry if none is supplied."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.sellCap || !options.network || options.help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let { sellCap } = options;

  try {
    console.log(`Setting sell cap to ${sellCap} tokens for CST (${cst.address})...`);
    await cst.setSellCap(sellCap);
    console.log('done');
  } catch (err) {
    console.error(`Error setting sell cap for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
