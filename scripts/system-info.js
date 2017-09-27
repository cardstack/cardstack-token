const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const { NULL_ADDRESS, CST_NAME } = require("../lib/constants");

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
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  if (cstAddress === NULL_ADDRESS) {
    console.log(`There is no CST contract resgistered with the Registry at ${registry.address}`);
    callback();
    return;
  }

  let registryAdminCount = await registry.totalAdmins();
  let registrySuperAdminCount = await registry.totalSuperAdmins();

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
  let totalSupply = await cst.totalSupply();
  let cstFrozenCount = await cst.totalFrozenAccounts();
  let cstAdminCount = await cst.totalAdmins();
  let cstSuperAdminCount = await cst.totalSuperAdmins();
  let cstBuyerCount = await cst.totalBuyers();
  let cstCustomBuyerCount = await cst.totalCustomBuyers();
  let cstBuyerPool = await cst.cstBuyerPool();
  let cstBalanceLimit = await cst.cstBalanceLimit();

  let storageAddress = await registry.storageForHash(web3.sha3(cstStorageName.toString()));
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));

  let storage = await ExternalStorage.at(storageAddress);
  let ledger = await CstLedger.at(ledgerAddress);

  let totalTokens = await ledger.totalTokens();
  let totalInCirculation = await ledger.totalInCirculation();
  let numAccounts = await ledger.ledgerCount();
  let ledgerAdminCount = await ledger.totalAdmins();
  let ledgerSuperAdminCount = await ledger.totalSuperAdmins();

  let storageAdminCount = await storage.totalAdmins();
  let storageSuperAdminCount = await storage.totalSuperAdmins();

  function prettyAddress(address) {
    if (address === registry.address) {
      return `${address} (registry)`;
    } else if (address === cst.address) {
      return `${address} (cst)`;
    } else if (address === ledger.address) {
      return `${address} (ledger)`;
    } else if (address === storage.address) {
      return `${address} (storage)`;
    }

    return address;
  }

  console.log(`
Contracts:
  Registry: ${prettyAddress(registry.address)}
  Storage: ${prettyAddress(storage.address)}
  Ledger: ${prettyAddress(ledger.address)}
  CST contract: ${prettyAddress(cst.address)}

Registry (${registry.address}):
  ${CST_NAME}: ${prettyAddress(cstAddress)}
  ${cstStorageName.toString()}: ${prettyAddress(storageAddress)}
  ${cstLedgerName.toString()}: ${prettyAddress(ledgerAddress)}

  Registry super admins:`);
  for (let i = 0; i < registrySuperAdminCount; i++) {
    let address = await registry.superAdminsForIndex(i);
    let isAdmin = await registry.superAdmins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`
  Registry admins:`);
  for (let i = 0; i < registryAdminCount; i++) {
    let address = await registry.adminsForIndex(i);
    let isAdmin = await registry.admins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }

  console.log(`

Ledger (${ledger.address})
  totalTokens: ${totalTokens}
  totalInCirculation: ${totalInCirculation}
  number of accounts: ${numAccounts}

  Ledger super admins:`);
  for (let i = 0; i < ledgerSuperAdminCount; i++) {
    let address = await ledger.superAdminsForIndex(i);
    let isAdmin = await ledger.superAdmins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`
  Ledger admins:`);
  for (let i = 0; i < ledgerAdminCount; i++) {
    let address = await ledger.adminsForIndex(i);
    let isAdmin = await ledger.admins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }

  console.log(`

Storage (${storage.address})
  Storage super admins:`);
  for (let i = 0; i < storageSuperAdminCount; i++) {
    let address = await storage.superAdminsForIndex(i);
    let isAdmin = await storage.superAdmins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`
  Storage admins:`);
  for (let i = 0; i < storageAdminCount; i++) {
    let address = await storage.adminsForIndex(i);
    let isAdmin = await storage.admins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`

Cardstack Token (${cst.address}):
  registry: ${prettyAddress(cstRegistry)}
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
  buyerPool: ${cstBuyerPool}
  balanceLimit: ${(cstBalanceLimit.toNumber() / cstBuyerPool.toNumber()) * 100}% (${cstBalanceLimit} CST)
  totalSupply: ${totalSupply}
  balance (ETH): ${web3.fromWei(balanceWei, "ether")}
  foundation: ${foundation}

  CST super admins:`);
  for (let i = 0; i < cstSuperAdminCount; i++) {
    let address = await cst.superAdminsForIndex(i);
    let isAdmin = await cst.superAdmins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`
  CST admins:`);
  for (let i = 0; i < cstAdminCount; i++) {
    let address = await cst.adminsForIndex(i);
    let isAdmin = await cst.admins(address);
    if (isAdmin) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }
  console.log(`
  CST Buyers with custom balance limit:`);
  for (let i = 0; i < cstCustomBuyerCount; i++) {
    let address = await cst.customBuyerForIndex(i);
    let limit = await cst.customBuyerLimit(address);
    limit = limit.toNumber();
    if (limit) {
      console.log(`    ${prettyAddress(address)}: ${(limit/cstBuyerPool.toNumber()) * 100}% (${limit} CST)`);
    }
  }
  console.log(`
  CST Buyers:`);
  for (let i = 0; i < cstBuyerCount; i++) {
    let address = await cst.approvedBuyerForIndex(i);
    let isBuyer = await cst.approvedBuyer(address);
    if (isBuyer) {
      console.log(`    ${prettyAddress(address)}`);
    }
  }

  console.log(`
  Frozen Accounts:`);
  for (let i = 0; i < cstFrozenCount; i++) {
    let address = await cst.frozenAccountForIndex(i);
    let isFrozen = await cst.frozenAccount(address);
    if (isFrozen) {
      console.log(`    ${address}`);
    }
  }

  callback();
};
