const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-set-foundation",
    content: "This script sets the Cardstack foundation address that will be depositing and withdrawing ETH from the CST contract."
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
      name: "address",
      alias: "a",
      description: "The address of the Cardstack foundation."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let foundation = options.address;

  try {
    console.log(`Setting cst foundation to ${foundation} for CST (${cst.address})...`);
    await cst.setFoundation(foundation);
    console.log('done');
  } catch (err) {
    console.error(`Error setting cst foundation for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
