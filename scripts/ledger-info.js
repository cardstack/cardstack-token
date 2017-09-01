let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));

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
