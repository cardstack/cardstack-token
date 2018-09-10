const { CST_LEDGER_NAME, CST_STORAGE_NAME } = require("../lib/constants.js");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const RegistryContract = artifacts.require("./Registry.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const ExternalStorage = artifacts.require("./ExternalStorage.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "ledger", type: String, description: "The address of the ledger contract (must be owner/superAdmin)" },
  { name: "storage", type: String, description: "The address of the ledger storage contract (must be owner/superAdmin)" },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "registry-add-storage",
    content: "This script adds storage contracts to the registry"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);
  let { network, ledger:ledgerAddress, storage:storageAddress, registry:registryAddress, help } = options;

  if (!network || !(ledgerAddress || storageAddress) || help || !registryAddress) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  try {
    let registry = await RegistryContract.at(registryAddress);
    console.log(`Using registry at ${registry.address}`);

    let ledger = ledgerAddress ? await CstLedger.at(ledgerAddress) : null;
    let storage = storageAddress ? await ExternalStorage.at(storageAddress) : null;

    if (ledger) {
      console.log(`\nGranting registry permissions to manage ledger...`);
      await ledger.addSuperAdmin(registry.address);

      console.log(`Adding ledger storage to registry with name '${CST_LEDGER_NAME}'...`);
      await registry.addStorage(CST_LEDGER_NAME, ledger.address);
    }

    if (storage) {
      console.log(`\nGranting registry permissions to manage storage...`);
      await storage.addSuperAdmin(registry.address);

      console.log(`Adding storage to registry with name '${CST_STORAGE_NAME}'...`);
      await registry.addStorage(CST_STORAGE_NAME, storage.address);
    }

    console.log(`\nCompleted adding storage.`);

  } catch(err) {
    console.error("Error encountered adding storage", err);
  }

  callback();
};
