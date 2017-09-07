const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "registry", type: String, alias: "r" },
  { name: "cst", type: String, alias: "c" }
];

const usage = [
  {
    header: "cst-register",
    content: "This script registers a CST contract with the registry."
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
      name: "cst",
      alias: "c",
      description: "The address of the CST contract that you wish to register"
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.cst || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();
  let cstAddress = options.cst;

  console.log(`Using registry at ${registry.address}`);
  console.log(`Registering contract ${cstAddress}...`);

  try {
    await registry.register(CST_NAME, cstAddress);
    console.log(`\nRegistered CST (${cstAddress}) as contract "${CST_NAME}" with registry (${registry.address})`);
  } catch (err) {
    console.error(`\nError registering CST contract with registry (${registry.address}, ${err.message}`);
  }

  callback();
};
