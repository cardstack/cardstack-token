const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", type: String },
  { name: "amount", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-grant-tokens",
    content: "This script grants tokens to the specified address"
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
      description: "The address to receive the granted tokens."
    },{
      name: "amount",
      description: "The amount of CST tokens to grant."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || !options.amount || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let { address, amount } = options;

  try {
    console.log(`Granting ${amount} CST to ${address} for CST (${cst.address})...`);
    await cst.grantTokens(address, amount);
    console.log('done');
  } catch (err) {
    console.error(`Error granting tokens for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
