const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "cst-suspend-transfers",
    content: "This script asuspends the transfers of the CST token (with the exception of addresses that have been added to the transfer whitelist)."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if ((!options.network && !options.data) || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = await RegistryContract.at(registryAddress);

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  if (options.data) {
    let data = cst.contract.setAllowTransfers.getData(false);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for suspending transfers of CST ${cst.address}...`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);

    callback();
    return;
  }

  try {
    console.log(`Suspending transfers of CST ${cst.address}...`);
    await cst.setAllowTransfers(false);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered suspending transfers, ${err.message}`);
  }

  callback();
};
