const { CST_NAME } = require("../lib/utils");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "amount", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-mint-tokens",
    content: "This script mints the specified number of CST tokens."
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
      name: "amount",
      description: "The amount of CST tokens to mint."
    },{
      name: "registry",
      alias: "r",
      description: "(Optional) The address of the registry. The script will attempt to detect the registry if none is supplied."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.amount || !options.network || options.help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let numOfTokens = options.amount;

  try {
    console.log(`Minting ${numOfTokens} for CST (${cst.address}...`);
    await cst.mintTokens(numOfTokens);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered minting tokens for CST (${cst.address}), ${err.message}`);
  }

  callback();
};
