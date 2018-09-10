const { CST_NAME } = require("../lib/constants");
const { getLedger } = require('../lib/ledger');
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const fs = require('fs');
const CardstackToken = artifacts.require("./CardstackToken.sol");
const RegistryContract = artifacts.require("./Registry.sol");
const CstLedger = artifacts.require("./CstLedger.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).div(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "csv", type: String, description: "(optional) The CSV file to write the ledger report" },
  { name: "importable", type: Boolean, description: "(optional) output csv format in a manner that can be used in grant token script as raw token values" }
];

const usage = [
  {
    header: "ledger-info",
    content: "This script dispays information about the ledger used for CST."
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

  let { registry:registryAddress,
        address:queryAddress,
        importable,
        csv:csvFile } = options;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardstackToken.at(cstAddress);
  let cstLedgerName = await cst.ledgerName();
  let cstSymbol = await cst.symbol();
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));
  let ledgerContract = await CstLedger.at(ledgerAddress);
  let totalTokens = await ledgerContract.totalTokens();
  let totalInCirculation = await ledgerContract.totalInCirculation();
  let buyPriceTokensPerWei = await cst.buyPrice();
  let decimals = await cst.decimals();
  let sigDigits = 6;
  let version;
  try {
    version = await ledgerContract.version();
  } catch (e) {
    version = "1"; // version function did not exist in initial contract
  }

  let ledger = await getLedger(web3, cst);

  if (csvFile) {
    console.log(`Writing file ${csvFile}...`);
    if (!importable) {
      fs.writeFileSync(csvFile, `"address","ETH","${raw ? 'raw token amount' : cstSymbol}"\n`, 'ascii');
    }
    let sum = new web3.BigNumber(0);
    for (let address of Object.keys(ledger)) {
      let balance = ledger[address];

      let balanceEth = !buyPriceTokensPerWei.toNumber() ? '' : Math.round(balance.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerWei).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;

      if (importable) {
        sum = sum.add(balance);
        let [ formattedBalance ] = balance.toPrecision(50).toString().split('.');
        fs.appendFileSync(csvFile, `"${address}","${formattedBalance}"\n`);
      } else {
        fs.appendFileSync(csvFile, `"${address}","${balanceEth}","${raw ? balance : adjustForDecimals(balance, decimals)}"\n`);
      }
    }

    if (importable) {
      console.log(`Exported ledger for ${Object.keys(ledger).length} token holder addresses`);
      console.log(`ledger total:                `, adjustForDecimals(totalInCirculation, decimals).toString());
      console.log(`exported ledger total tokens:`, adjustForDecimals(sum, decimals).toString());
    }

    console.log("Done");
    callback();
    return;
  }

  console.log(`
Cardstack Token (${cst.address})
Ledger (${ledger.address}):
  version: ${version}
  totalTokens: ${adjustForDecimals(totalTokens, decimals)} ${cstSymbol}
  totalInCirculation: ${adjustForDecimals(totalInCirculation, decimals)} ${cstSymbol}
  number of accounts: ${Object.keys(ledger).length}

  * Note that ETH amounts expressed below are based on the token contract's buy price\n`);

  if (!queryAddress) {
    console.log(`Accounts:`);

    for (let address of Object.keys(ledger)) {
      let balance = ledger[address];
      let balanceEth = !buyPriceTokensPerWei.toNumber() ? 'Not Available' : Math.round(balance.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerWei).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;
      console.log(`  ${address}: ${adjustForDecimals(balance, decimals)} ${cstSymbol} (${balanceEth} ETH)`);
    }
  } else {
    console.log(`Individual Account Info:`);
    let balance = await ledger.balanceOf(queryAddress);
    let balanceEth = !buyPriceTokensPerWei.toNumber() ? 'Not Available' : Math.round(balance.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerWei).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;
    console.log(`  ${queryAddress}: ${adjustForDecimals(balance, decimals)} ${cstSymbol} (${balanceEth} ETH)`);
  }

  callback();
};
