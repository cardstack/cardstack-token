const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const cstRegistryName = 'cst';

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "system-info",
    content: "This script displays an overview of the Cardstack smart contracts."
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
      name: "registry",
      alias: "r",
      description: "(Optional) The address of the registry. The script will attempt to detect the registry if none is supplied."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));

  let cst = await CardStackToken.at(cstAddress);

  let cstRegistry = await cst.registry();
  let cstFrozen = await cst.frozenToken();
  let cstDeprecated = await cst.isDeprecated();
  let successor = await cst.successor();

  let cstStorageName = await cst.storageName();
  let cstLedgerName = await cst.ledgerName();
  let cstName = await cst.name();
  let cstSymbol = await cst.symbol();
  let buyPriceWei = await cst.buyPrice();
  let sellPriceWei = await cst.sellPrice();
  let sellCap = await cst.sellCap();
  let foundation = await cst.foundation();
  let balanceWei = await web3.eth.getBalance(cst.address);
  let minBalanceWei = await cst.minimumBalance();
  let cstAvailableToBuy = await cst.cstAvailableToBuy();

  let storageAddress = await registry.storageForHash(web3.sha3(cstStorageName.toString()));
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));

  let storage = await ExternalStorage.at(storageAddress);
  let ledger = await CstLedger.at(ledgerAddress);

  let totalTokens = await ledger.totalTokens();
  let totalInCirculation = await ledger.totalInCirculation();
  let numAccounts = await ledger.ledgerCount();
  let isCstAdminOfLedger = await ledger.admins(cst.address);

  let isCstAdminOfStorage = await storage.admins(cst.address);

  console.log(`
Contracts:
  Registry: ${registry.address}
  Storage: ${storage.address}
  Ledger: ${ledger.address}
  CST contract: ${cst.address}

Registry (${registry.address}):
  ${cstRegistryName}: ${cstAddress}
  ${cstStorageName.toString()}: ${storageAddress}
  ${cstLedgerName.toString()}: ${ledgerAddress}

Cardstack Token (${cst.address}):
  registry: ${cstRegistry}
  storageName: ${cstStorageName}
  ledgerName: ${cstLedgerName}
  isFrozen: ${cstFrozen}
  deprecated: ${cstDeprecated}
  successor: ${successor}
  name: ${cstName}
  symbol: ${cstSymbol}
  buyPrice (ETH): ${web3.fromWei(buyPriceWei, "ether")}
  sellPrice (ETH): ${web3.fromWei(sellPriceWei, "ether")}
  sellCap: ${sellCap}
  cstAvailableToBuy: ${cstAvailableToBuy}
  balance (ETH): ${web3.fromWei(balanceWei, "ether")}
  minimumBalance (ETH): ${web3.fromWei(minBalanceWei, "ether")}
  foundation: ${foundation}

Ledger (${ledger.address})
  admin ${cst.address}: ${isCstAdminOfLedger}
  totalTokens: ${totalTokens}
  totalInCirculation: ${totalInCirculation}
  number of accounts: ${numAccounts}

Storage (${storage.address})
  admin ${cst.address}: ${isCstAdminOfStorage}
  `);

  callback();
};
