let RegistryContract = artifacts.require("./Registry.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

module.exports = async function(deployer) {
  await deployer.deploy(ExternalStorage);
  await deployer.deploy(CstLedger);

  let ledger = await CstLedger.deployed();
  let storage = await ExternalStorage.deployed();
  let registry = await RegistryContract.deployed();

  await storage.addSuperAdmin(registry.address);
  await ledger.addSuperAdmin(registry.address);

  await registry.addStorage("cstStorage", storage.address);
  await registry.addStorage("cstLedger", ledger.address);
};
