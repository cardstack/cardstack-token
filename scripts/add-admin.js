const { CST_NAME, CST_STORAGE_NAME, CST_LEDGER_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "name", alias: "n", type: String, description: "The registered name of the contract/storage to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "add-admin",
    content: "This script adds an admin to a contract"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || !options.name || (!options.network && !options.data) || options.help || options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);

  let { address, name } = options;
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardstackToken.at(cstAddress);
  let storageAddress = await registry.storageForHash(web3.sha3(CST_STORAGE_NAME));
  let ledgerAddress = await registry.storageForHash(web3.sha3(CST_LEDGER_NAME));
  let storage = await ExternalStorage.at(storageAddress);
  let ledger = await CstLedger.at(ledgerAddress);

  let contract;
  switch (name) {
    case CST_NAME:
      contract = cst;
      break;
    case CST_LEDGER_NAME:
      contract = ledger;
      break;
    case CST_STORAGE_NAME:
      contract = storage;
      break;
  }

  if (!contract) {
    console.log(`Could not find contract for ${name}`);
    callback();
    return;
  }

  if (options.data) {
    let data = contract.contract.addAdmin.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: contract.address,
      data
    });
    console.log(`Data for adding "${address}" as admin for ${name} (${contract.address}):`);
    console.log(`\nAddress: ${contract.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Adding "${address}" as admin for ${name} (${contract.address})...`);
    await contract.addAdmin(address);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered adding admin for ${name} (${contract.address}), ${err.message}`);
  }

  callback();
};
