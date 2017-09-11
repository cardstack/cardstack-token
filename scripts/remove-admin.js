const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const cstStorageName = 'cstStorage';
const cstLedgerName = 'cstLedger';

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String},
  { name: "name", alias: "n", type: String},
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "remove-admin",
    content: "This script removes an admin from a contract"
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
      alias: "a",
      description: "The address of the revoked admin"
    },{
      name: "name",
      alias: "n",
      description: "The registered name of the contract/storage to revoke admin permissions from"
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    },{
      name: "data",
      alias: "d",
      description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction"
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || !options.name || (!options.network && !options.data) || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);

  let { address, name } = options;
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardStackToken.at(cstAddress);
  let storageAddress = await registry.storageForHash(web3.sha3(cstStorageName));
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName));
  let storage = await ExternalStorage.at(storageAddress);
  let ledger = await CstLedger.at(ledgerAddress);

  let contract;
  switch (name) {
    case 'cst':
      contract = cst;
      break;
    case 'cstLedger':
      contract = ledger;
      break;
    case 'cstStorage':
      contract = storage;
      break;
  }

  if (!contract) {
    console.log(`Could not find contract for ${name}`);
    callback();
    return;
  }


  if (options.data) {
    let data = contract.contract.removeAdmin.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: contract.address,
      data
    });
    console.log(`Data for removing "${address}" as admin for ${name} (${contract.address}):`);
    console.log(`\nAddress: ${contract.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Removing "${address}" as admin for ${name} (${contract.address})...`);
    await contract.removeAdmin(address);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered removing admin for ${name} (${contract.address}), ${err.message}`);
  }

  callback();
};
