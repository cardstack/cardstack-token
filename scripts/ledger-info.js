const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
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

  let registryAddress = options.registry;
  let queryAddress = options.address;

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

    console.log(
`Ledger (${ledger.address}
  totalTokens: ${totalTokens} ${cstSymbol}
  totalInCirculation: ${totalInCirculation} ${cstSymbol}
  number of accounts: ${numAccounts}\n`);

  if (!queryAddress) {
    console.log(`Accounts:`);

    for (let i = 0; i < numAccounts.toNumber(); i++) {
      let address = await ledger.accountForIndex(i);
      let balance = await ledger.balanceOf(address);
      console.log(`  ${address}: ${balance} ${cstSymbol}`);
    }
  } else {
    console.log(`Individual Account Info:`);
    let balance = await ledger.balanceOf(queryAddress);
    console.log(`  ${queryAddress}: ${balance} ${cstSymbol}`);
  }

  callback();
};
