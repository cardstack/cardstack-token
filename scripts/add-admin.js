let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const cstRegistryName = 'cst';
const cstStorageName = 'cstStorage';
const cstLedgerName = 'cstLedger';

module.exports = async function(callback) {
  if (process.argv.length < 6) {
    console.error("USAGE: truffle exec ./scripts/add-admin.js <admin address> <contract/storage name>");
    callback();
    return;
  }

  let address = process.argv[4];
  let name = process.argv[5];
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
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

  try {
    await contract.addAdmin(address);
    console.log(`Added "${address}" as admin for ${name} (${contract.address})`);
  } catch (err) {
    console.error(`Error encountered adding admin for ${name} (${contract.address}), ${err.message}`);
  }

  callback();
};
