const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
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
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (options.amount === undefined || options.amount === null || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardStackToken.at(cstAddress);
  let cstLedgerName = await cst.ledgerName();
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));
  let ledger = await CstLedger.at(ledgerAddress);

  let totalTokens = await ledger.totalTokens();
  let totalInCirculation = await ledger.totalInCirculation();
  let numAccounts = await ledger.ledgerCount();

  console.log(
`Ledger (${ledger.address}
  totalTokens: ${totalTokens}
  totalInCirculation: ${totalInCirculation}
  number of accounts: ${numAccounts}

Accounts:`);

  for (let i = 0; i < numAccounts.toNumber(); i++) {
    let address = await ledger.accountForIndex(i);
    let balance = await ledger.balanceOf(address);
    console.log(`  ${address}: ${balance}`);
  }

  callback();
};
