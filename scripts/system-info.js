const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const { NULL_ADDRESS, CST_NAME, CST_LEDGER_NAME, CST_STORAGE_NAME } = require("../lib/constants");

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

  let cst, cstRegistry, cstFrozen, cstDeprecated, successor, cstStorageName, cstLedgerName, cstName,
    cstSymbol, buyPriceWei, sellPriceWei, sellCap, foundation, balanceWei, totalSupply, cstFrozenCount,
    cstAdminCount, cstSuperAdminCount, cstBuyerCount, cstCustomBuyerCount, cstBuyerPool, cstBalanceLimit;

  if (cstAddress === NULL_ADDRESS) {
    console.log(`There is no CST contract resgistered with the Registry at ${registry.address}`);
  } else {
    cst = await CardStackToken.at(cstAddress);

    cstRegistry = await cst.registry();
    cstFrozen = await cst.frozenToken();
    cstDeprecated = await cst.isDeprecated();
    successor = await cst.successor();

    cstStorageName = await cst.storageName();
    cstLedgerName = await cst.ledgerName();
    cstName = await cst.name();
    cstSymbol = await cst.symbol();
    buyPriceWei = await cst.buyPrice();
    sellPriceWei = await cst.sellPrice();
    sellCap = await cst.sellCap();
    foundation = await cst.foundation();
    balanceWei = await web3.eth.getBalance(cst.address);
    totalSupply = await cst.totalSupply();
    cstFrozenCount = await cst.totalFrozenAccountsMapping();
    cstAdminCount = await cst.totalAdminsMapping();
    cstSuperAdminCount = await cst.totalSuperAdminsMapping();
    cstBuyerCount = await cst.totalBuyersMapping();
    cstCustomBuyerCount = await cst.totalCustomBuyersMapping();
    cstBuyerPool = await cst.cstBuyerPool();
    cstBalanceLimit = await cst.cstBalanceLimit();
    cstAllowTransfers = await cst.allowTransfers();
  }

  let registryAdminCount = await registry.totalAdminsMapping();
  let registrySuperAdminCount = await registry.totalSuperAdminsMapping();

  let storageAddress = await registry.storageForHash(web3.sha3(CST_STORAGE_NAME));
  let ledgerAddress = await registry.storageForHash(web3.sha3(CST_LEDGER_NAME));

  let storage, storageAdminCount, storageSuperAdminCount, ledger, totalTokens, totalInCirculation,
    numAccounts, ledgerAdminCount, ledgerSuperAdminCount;

  if (storageAddress === NULL_ADDRESS) {
    console.log(`There is no storage contract registered with the Registry at ${registry.address}`);
  } else {
    storage = await ExternalStorage.at(storageAddress);
    storageAdminCount = await storage.totalAdminsMapping();
    storageSuperAdminCount = await storage.totalSuperAdminsMapping();
  }

  if (ledgerAddress === NULL_ADDRESS) {
    console.log(`There is no ledger contract registered with the Registry at ${registryAddress}`);
  } else {
    ledger = await CstLedger.at(ledgerAddress);
    totalTokens = await ledger.totalTokens();
    totalInCirculation = await ledger.totalInCirculation();
    numAccounts = await ledger.ledgerCount();
    ledgerAdminCount = await ledger.totalAdminsMapping();
    ledgerSuperAdminCount = await ledger.totalSuperAdminsMapping();
  }


  function prettyAddress(address) {
    if (address === registry.address) {
      return `${address} (registry)`;
    } else if (cst && address === cst.address) {
      return `${address} (cst)`;
    } else if (ledger && address === ledger.address) {
      return `${address} (ledger)`;
    } else if (storage && address === storage.address) {
      return `${address} (storage)`;
    }

    return address;
  }

  console.log(`
Contracts:
  Registry: ${prettyAddress(registry.address)}`);

  if (storage) {
    console.log(`  Storage: ${prettyAddress(storage.address)}`);
  }

  if (ledger) {
    console.log(`  Ledger: ${prettyAddress(ledger.address)}`);
  }

  if (cst) {
    console.log(`  CST contract: ${prettyAddress(cst.address)}`);
  }

console.log(`

Registry (${registry.address}):
  ${CST_NAME}: ${prettyAddress(cstAddress)}
  ${CST_STORAGE_NAME}: ${prettyAddress(storageAddress)}
  ${CST_LEDGER_NAME}: ${prettyAddress(ledgerAddress)}

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

  if (ledger) {
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
  }

  if (storage) {
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
  }

  if (cst) {
    console.log(`

Cardstack Token (${cst.address}):
  registry: ${prettyAddress(cstRegistry)}
  storageName: ${cstStorageName}
  ledgerName: ${cstLedgerName}
  isFrozen: ${cstFrozen}
  allowTransfers: ${cstAllowTransfers}
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
  }

  callback();
};
