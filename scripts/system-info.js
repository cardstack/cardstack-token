const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const moment = require('moment');

const dateFormat = "YYYY-MM-DD HH:mm Z";

let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const { NULL_ADDRESS, CST_NAME, CST_LEDGER_NAME, CST_STORAGE_NAME } = require("../lib/constants");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).div(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "ledgerName", type: String, description: "(optional) The name of the ledger to use" },
  { name: "storageName", type: String, description: "(optional) The name of the storage to use" },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
];

const usage = [
  {
    header: "system-info",
    content: "This script displays an overview of the Cardstack smart contracts."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let { ledgerName, storageName } = options;
  ledgerName = ledgerName || CST_LEDGER_NAME;
  storageName = storageName || CST_STORAGE_NAME;

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst, cstRegistry, cstFrozen, cstDeprecated, successor, cstStorageName, cstLedgerName, cstName,
    cstSymbol = "", buyPriceTokensPerWei, circulationCap, foundation, balanceWei, totalSupply, cstFrozenCount,
    cstAdminCount, cstSuperAdminCount, cstHaltPurchase, cstBuyerCount, cstCustomBuyerCount, cstBalanceLimit,
    contributionMinimum, cstWhitelistedTransfererCount, cstAllowTransfers, vestingCount, cstAvailable,
    cstTotalInCirculation, decimals, cstVersion, defaultLimitEth;

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
    buyPriceTokensPerWei = await cst.buyPrice();
    circulationCap = await cst.circulationCap();
    cstTotalInCirculation = await cst.totalInCirculation();
    foundation = await cst.foundation();
    balanceWei = await web3.eth.getBalance(cst.address);
    totalSupply = await cst.totalSupply();
    cstFrozenCount = await cst.totalFrozenAccountsMapping();
    cstAdminCount = await cst.totalAdminsMapping();
    cstSuperAdminCount = await cst.totalSuperAdminsMapping();
    cstBuyerCount = await cst.totalBuyersMapping();
    cstHaltPurchase = await cst.haltPurchase();
    cstCustomBuyerCount = await cst.totalCustomBuyersMapping();
    cstWhitelistedTransfererCount = await cst.totalTransferWhitelistMapping();
    cstBalanceLimit = await cst.cstBalanceLimit();
    cstAllowTransfers = await cst.allowTransfers();
    contributionMinimum = await cst.contributionMinimum();
    vestingCount = await cst.vestingMappingSize();
    cstAvailable = await cst.tokensAvailable();

    decimals = await cst.decimals();

    let sigDigits = 6;
    defaultLimitEth = !cstBalanceLimit.toNumber() ? 0 :  Math.round(cstBalanceLimit.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerWei).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;

    try {
      cstVersion = await cst.version();
    } catch (err) {
      cstVersion = "1"; // this property wasnt introduced in the initial contracts
    }
  }

  let registryAdminCount = await registry.totalAdminsMapping();
  let registrySuperAdminCount = await registry.totalSuperAdminsMapping();
  let registryCstNamehash = await registry.namehashForHash(web3.sha3(CST_NAME));

  let storageAddress = await registry.storageForHash(web3.sha3(storageName));
  let ledgerAddress = await registry.storageForHash(web3.sha3(ledgerName));

  let storage, storageAdminCount, storageSuperAdminCount, ledger, totalTokens, totalInCirculation,
    numAccounts, ledgerAdminCount, ledgerSuperAdminCount;

  if (storageAddress === NULL_ADDRESS) {
    console.log(`There is no storage contract registered with the Registry at ${registry.address} with name of '${storageName}'`);
  } else {
    storage = await ExternalStorage.at(storageAddress);
    storageAdminCount = await storage.totalAdminsMapping();
    storageSuperAdminCount = await storage.totalSuperAdminsMapping();
  }

  if (ledgerAddress === NULL_ADDRESS) {
    console.log(`There is no ledger contract registered with the Registry at ${registryAddress} with name of '${ledgerName}'`);
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
  ${storageName}: ${prettyAddress(storageAddress)}
  ${ledgerName}: ${prettyAddress(ledgerAddress)}

  Namehash for CST Token contract: ${registryCstNamehash}

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

Ledger - ${ledgerName} (${ledger.address})
  total tokens: ${adjustForDecimals(totalTokens, decimals)}
  number of accounts: ${numAccounts}
  total in circulation: ${adjustForDecimals(totalInCirculation, decimals)}*
    * not counting unvested & vested-unreleased tokens

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

Storage - ${storageName} (${storage.address})
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
    let totalUnvested = new web3.BigNumber(0);
    let totalVestedUnreleased = new web3.BigNumber(0);
    for (let i = 0; i < vestingCount; i++) {
      let beneficiary = await cst.vestingBeneficiaryForIndex(i);
      let releasableAmount = await cst.releasableAmount(beneficiary);
      totalVestedUnreleased = totalVestedUnreleased.add(releasableAmount);
      let [ startDate,
            cliffDate,
            durationSec,
            fullyVestedAmount,
            vestedAmount,
            vestedAvailableAmount,
            releasedAmount,
            revokeDate,
            isRevocable ] = await cst.vestingSchedule(beneficiary);
      if (!revokeDate.toNumber()) {
        totalUnvested = totalUnvested.add(fullyVestedAmount.sub(vestedAmount));
      }
      vestingSchedules = `${vestingSchedules}
    beneficiary: ${beneficiary} ${revokeDate.toNumber() > 0 ? "Revoked on " + moment.unix(revokeDate.toNumber()).format(dateFormat) : ""}
      start date: ${moment.unix(startDate.toNumber()).format(dateFormat)}
      cliff date: ${moment.unix(cliffDate.toNumber()).format(dateFormat)}
      fully vested date: ${moment.unix(startDate.toNumber() + durationSec.toNumber()).format(dateFormat)}
      fully vested amount: ${adjustForDecimals(fullyVestedAmount, decimals)} ${cstSymbol}
      vested amount as of now (${moment().format(dateFormat)}): ${adjustForDecimals(vestedAmount, decimals).toFixed(0)} ${cstSymbol}
      vested amount available as of now (${moment().format(dateFormat)}): ${adjustForDecimals(vestedAvailableAmount, decimals)} ${cstSymbol}
      vested amount already released: ${adjustForDecimals(releasedAmount, decimals)} ${cstSymbol}
      vested amount not yet released ${adjustForDecimals(releasableAmount, decimals)} ${cstSymbol}
      is revocable: ${isRevocable}\n`;
    }

    console.log(`

Cardstack Token (${cst.address}):
  registry: ${prettyAddress(cstRegistry)}
  version: ${cstVersion}
  decimals: ${decimals}
  storage name: ${cstStorageName}
  ledger name: ${cstLedgerName}
  is frozen: ${cstFrozen}
  purchases halted: ${cstHaltPurchase}
  allow transfers: ${cstAllowTransfers}
  deprecated: ${cstDeprecated}
  successor: ${successor}
  name: ${cstName}
  symbol: ${cstSymbol}
  buy price: ${cstSymbol} per ETH: ${buyPriceTokensPerWei} ${cstSymbol}
  total tokens available: ${adjustForDecimals(cstAvailable, decimals)} ${cstSymbol}
  circulation cap: ${adjustForDecimals(circulationCap, decimals)} ${cstSymbol}
  tokens in circulation (includes unvested tokens): ${adjustForDecimals(cstTotalInCirculation, decimals)} ${cstSymbol}
  total tokens available for purchase: ${adjustForDecimals(circulationCap.sub(cstTotalInCirculation), decimals)} ${cstSymbol}
  total unvested tokens: ${adjustForDecimals(totalUnvested, decimals).toFixed(0)} ${cstSymbol}
  total vested and unreleased tokens: ${adjustForDecimals(totalVestedUnreleased, decimals)} ${cstSymbol}
  contribution minimum: ${adjustForDecimals(contributionMinimum, decimals)} ${cstSymbol}
  balance limit (purchase cap): ${defaultLimitEth} ETH (${adjustForDecimals(cstBalanceLimit, decimals)} ${cstSymbol})
  total supply: ${adjustForDecimals(totalSupply, decimals)} ${cstSymbol}
  token contract balance: ${web3.fromWei(balanceWei, "ether")} ETH
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
  CST Vesting: ${vestingSchedules || '\n'}

  CST Buyers with custom balance limit: ~${cstCustomBuyerCount} addresses

  CST Buyers: ~${cstBuyerCount} addresses

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
