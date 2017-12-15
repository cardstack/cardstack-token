const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const moment = require('moment');

const dateFormat = "YYYY-MM-DD HH:mm Z";

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
    cstSymbol, buyPriceWei, circulationCap, foundation, balanceWei, totalSupply, cstFrozenCount,
    cstAdminCount, cstSuperAdminCount, cstBuyerCount, cstCustomBuyerCount, cstBalanceLimit,
    contributionMinimum, cstWhitelistedTransfererCount, cstAllowTransfers, vestingCount, cstAvailable;

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
    circulationCap = await cst.circulationCap();
    foundation = await cst.foundation();
    balanceWei = await web3.eth.getBalance(cst.address);
    totalSupply = await cst.totalSupply();
    cstFrozenCount = await cst.totalFrozenAccountsMapping();
    cstAdminCount = await cst.totalAdminsMapping();
    cstSuperAdminCount = await cst.totalSuperAdminsMapping();
    cstBuyerCount = await cst.totalBuyersMapping();
    cstCustomBuyerCount = await cst.totalCustomBuyersMapping();
    cstWhitelistedTransfererCount = await cst.totalTransferWhitelistMapping();
    cstBalanceLimit = await cst.cstBalanceLimit();
    cstAllowTransfers = await cst.allowTransfers();
    contributionMinimum = await cst.contributionMinimum();
    vestingCount = await cst.vestingMappingSize();
    cstAvailable = await cst.tokensAvailable();
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
    } else if (foundation && address === foundation) {
      return `${address} (Cardstack Foundation)`;
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
    let vestingSchedules = "";
    let totalUnvested = 0;
    let totalVestedUnreleased = 0;
    for (let i = 0; i < vestingCount; i++) {
      let beneficiary = await cst.vestingBeneficiaryForIndex(i);
      let releasableAmount = await cst.releasableAmount(beneficiary);
      totalVestedUnreleased += releasableAmount.toNumber();
      let [ startDate,
            cliffDate,
            durationSec,
            fullyVestedAmount,
            vestedAmount,
            releasedAmount,
            revokeDate,
            isRevocable ] = await cst.getVestingSchedule(beneficiary);
      totalUnvested += (fullyVestedAmount.toNumber() - vestedAmount.toNumber());
      vestingSchedules = `${vestingSchedules}
    beneficiary: ${beneficiary} ${revokeDate.toNumber() > 0 ? "Revoked on " + moment.unix(revokeDate.toNumber()).format(dateFormat) : ""}
      start date: ${moment.unix(startDate.toNumber()).format(dateFormat)}
      cliff date: ${moment.unix(cliffDate.toNumber()).format(dateFormat)}
      fully vested date: ${moment.unix(startDate.toNumber() + durationSec.toNumber()).format(dateFormat)}
      fully vested amount: ${fullyVestedAmount} CST
      vested amount as of now (${moment().format(dateFormat)}): ${vestedAmount} CST
      vested amount already released: ${releasedAmount} CST
      vested amount not yet released ${releasableAmount} CST
      is revocable: ${isRevocable}\n`;
    }

    console.log(`

Cardstack Token (${cst.address}):
  registry: ${prettyAddress(cstRegistry)}
  storage name: ${cstStorageName}
  ledger name: ${cstLedgerName}
  is frozen: ${cstFrozen}
  allow transfers: ${cstAllowTransfers}
  deprecated: ${cstDeprecated}
  successor: ${successor}
  name: ${cstName}
  symbol: ${cstSymbol}
  buy price (ETH): ${web3.fromWei(buyPriceWei, "ether")}
  circulation cap: ${circulationCap} CST
  total tokens available: ${cstAvailable} CST
  total unvested tokens: ${totalUnvested} CST
  total vested and unreleased tokens: ${totalVestedUnreleased} CST
  contribution minimum: ${contributionMinimum} CST
  balance limit: ${cstBalanceLimit} CST
  total supply: ${totalSupply} CST
  balance (ETH): ${web3.fromWei(balanceWei, "ether")}
  foundation address: ${prettyAddress(foundation)}

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
  CST Whitelisted Transferers:`);
    for (let i = 0; i < cstWhitelistedTransfererCount; i++) {
      let address = await cst.whitelistedTransfererForIndex(i);
      let isWhitelisted = await cst.whitelistedTransferer(address);
      if (isWhitelisted) {
        console.log(`    ${prettyAddress(address)}`);
      }
    }
    console.log(`
  CST Vesting: ${vestingSchedules}`);
    console.log(`  CST Buyers with custom balance limit:`);
    for (let i = 0; i < cstCustomBuyerCount; i++) {
      let address = await cst.customBuyerForIndex(i);
      let limit = await cst.customBuyerLimit(address);
      limit = limit.toNumber();
      if (limit) {
        console.log(`    ${prettyAddress(address)}: ${limit} CST`);
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
