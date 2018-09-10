const { CST_NAME, CST_STORAGE_NAME } = require("../lib/constants.js");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "ledgerName", type: String, description: "The name of the new ledger to register" },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "cst-register-ledger",
    content: "This script creates a new ledger and attaches it to token"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || !options.ledgerName || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let { registry:registryAddress, ledgerName } = options;

  let registry = await RegistryContract.at(registryAddress);
  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardstackToken.at(cstAddress);

  try {
    console.log(`\nDeploying Ledger...`);

    let ledger = await CstLedger.new();
    console.log(`\nDeployed ledger to ${ledger.address}`);

    console.log(`\nGranting registry permissions to manage ledger...`);
    await ledger.addSuperAdmin(registry.address);

    console.log(`Adding ledger storage to registry with name '${ledgerName}'...`);
    await registry.addStorage(ledgerName, ledger.address);

    console.log(`Granting token permissions to use ledger...`);
    await ledger.addAdmin(cst.address);

    console.log(`Updating token...`);
    await cst.updateStorage(CST_STORAGE_NAME, ledgerName);

    console.log(`\nCompleted registering ledger with token.`);

  } catch(err) {
    console.error("Error encountered registering ledger with contract", err);
  }

  callback();
};
