const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "cst-add-whitelisted-transferer",
    content: "This script adds an address to the transfer whitelist"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || (!options.network && !options.data) || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let { address } = options;

  if (options.data) {
    let data = cst.contract.setWhitelistedTransferer.getData(address, true);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for whitelisting transferer "${address}":`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);

    callback();
    return;
  }

  try {
    console.log(`Adding whitelisted transferer "${address}" for CST ${cst.address}...`);
    await cst.setWhitelistedTransferer(address, true);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered whitelisting transferer, ${err.message}`);
  }

  callback();
};
