const { CST_NAME, CARDSTACK_NAMEHASH } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "cst", alias: "c",type: String, description: "(optional) The address of the deployed Cardstack token if you dont intend to deploy a new token contract." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "cst-register",
    content: "This script registers a CST contract with the registry."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);
  console.log(options);
  if (!options.cst || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();
  let cstAddress = options.cst;

  console.log(`Using registry at ${registry.address}`);

  if (options.data) {
    let data = registry.contract.register.getData(CST_NAME, cstAddress, CARDSTACK_NAMEHASH);
    let estimatedGas = web3.eth.estimateGas({
      to: registry.address,
      data
    });
    console.log(`Data for registering CST (${cstAddress}) as contract "${CST_NAME}" with registry (${registry.address}):`);
    console.log(`\nAddress: ${registry.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  console.log(`Registering contract ${cstAddress} ...`);

  try {
    await registry.register(CST_NAME, cstAddress, CARDSTACK_NAMEHASH);
    console.log(`\nRegistered CST (${cstAddress}) as contract "${CST_NAME}" with registry (${registry.address})`);
  } catch (err) {
    console.error(`\nError registering CST contract with registry ${registry.address}, ${err.message}`);
  }

  callback();
};
