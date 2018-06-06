const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const fs = require('fs');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).div(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
  { name: "csv", type: String },
  { name: "raw", type: Boolean },
  { name: "importable", type: Boolean },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "ledger-info",
    content: "This script dispays information about the ledger used for CST."
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
      name: "csv",
      description: "(optional) The CSV file to write the ledger report"
    },{
      name: "raw",
      description: "(optional) output raw token balances without regard to token decimal formatting"
    },{
      name: "importable",
      description: "(optional) output csv format in a manner that can be used in grant token script"
    },{
      name: "address",
      alias: "a",
      description: "(optional) address to get ledger info"
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

  let { registry:registryAddress,
        address:queryAddress,
        raw,
        importable,
        csv:csvFile } = options;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardStackToken.at(cstAddress);
  let cstLedgerName = await cst.ledgerName();
  let cstSymbol = await cst.symbol();
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));
  let ledger = await CstLedger.at(ledgerAddress);

  let totalTokens = await ledger.totalTokens();
  let totalInCirculation = await ledger.totalInCirculation();
  let numAccounts = await ledger.ledgerCount();
  let buyPriceTokensPerWei = await cst.buyPrice();
  let decimals = await cst.decimals();
  let sigDigits = 6;

  if (csvFile) {
    console.log(`Writing file ${csvFile}...`);
    if (!importable) {
      fs.writeFileSync(csvFile, `"address","ETH","${raw ? 'raw token amount' : cstSymbol}"\n`, 'ascii');
    }
    for (let i = 0; i < numAccounts.toNumber(); i++) {
      let address = await ledger.accountForIndex(i);
      let balance = await ledger.balanceOf(address);
      let balanceEth = !buyPriceTokensPerWei.toNumber() ? '' : Math.round(balance.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerWei).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;

      if (importable) {
        fs.appendFileSync(csvFile, `"${address}","${adjustForDecimals(balance, decimals)}"\n`);
      } else {
        fs.appendFileSync(csvFile, `"${address}","${balanceEth}","${raw ? balance : adjustForDecimals(balance, decimals)}"\n`);
      }
    }
    console.log("Done");
    callback();
    return;
  }

  console.log(`
Cardstack Token (${cst.address})
Ledger (${ledger.address}):
  totalTokens: ${adjustForDecimals(totalTokens, decimals)} ${cstSymbol}
  totalInCirculation: ${adjustForDecimals(totalInCirculation, decimals)} ${cstSymbol}
  number of accounts: ${numAccounts}

  * Note that ETH amounts expressed below are based on the token contract's buy price\n`);

  if (!queryAddress) {
    console.log(`Accounts:`);

    for (let i = 0; i < numAccounts.toNumber(); i++) {
      let address = await ledger.accountForIndex(i);
      let balance = await ledger.balanceOf(address);
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
