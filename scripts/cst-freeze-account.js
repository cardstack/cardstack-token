const { CST_NAME } = require("../lib/utils");
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
    header: "cst-freeze-account",
    content: "This script freezes a CST account."
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
      description: "The address of the the account to freeze"
    },{
      name: "registry",
      alias: "r",
      description: "(Optional) The address of the registry. The script will attempt to detect the registry if none is supplied."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || !options.network || options.help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let address = options.address;

  try {
    console.log(`Freezing account ${address} for CST (${cst.address})...`);
    await cst.freezeAccount(address, true);
    console.log('done');
  } catch (err) {
    console.error(`Error freezing account for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
