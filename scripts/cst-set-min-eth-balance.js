const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "amount", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-set-min-eth-balance",
    content: "This script specifies the minimum balance to maintain in ETH in the CST contract."
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
      description: "The minimum amount of ETH (in units of ETH) to maintain in the CST contract."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (options.amount === undefined || options.amount === null || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let minimumBalance = options.amount;

  try {
    console.log(`Setting minimum balance to ${minimumBalance} ETH for CST (${cst.address})...`);
    await cst.setMinimumBalance(web3.toWei(minimumBalance, "ether"));
    console.log('done');
  } catch (err) {
    console.error(`Error setting minimum balance for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
