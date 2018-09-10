const { CST_BUY_GAS_LIMIT, CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "cst-release-info",
    content: "This script display vesting release information that instructs how to send an ethereum transaction to release vested CST for the sender of the transaction."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const { network, help, registry } = commandLineArgs(optionsDefs);

  if (!network || help || !registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryContract = await RegistryContract.at(registry);

  console.log(`Using registry at ${registryContract.address}`);
  let cstAddress = await registryContract.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardstackToken.at(cstAddress);
  let symbol = await cst.symbol();

  let data = cst.contract.releaseVestedTokens.getData();

  console.log(`\nTo release your vested ${symbol} send 0 ETH (not including gas) to the following address with the following data:`);
  console.log(`Address: ${cst.address}`);
  console.log(`Data: ${data}`);
  console.log(`Estimated gas: ${CST_BUY_GAS_LIMIT}`);

  callback();
};
