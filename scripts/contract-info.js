let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  let registry = await RegistryContract.deployed();
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

  let storageAddress = await registry.storageForHash(web3.sha3(cstStorageName.toString()));
  let ledgerAddress = await registry.storageForHash(web3.sha3(cstLedgerName.toString()));

  let storage = await ExternalStorage.at(storageAddress);
  let ledger = await CstLedger.at(ledgerAddress);


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
  balance (ETH): ${web3.fromWei(balanceWei, "ether")}
  minimumBalance (ETH): ${web3.fromWei(minBalanceWei, "ether")}
  foundation: ${foundation}
  `);

};
