let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");

module.exports = function(deployer) {
  deployer.deploy(ExternalStorage);
  deployer.deploy(CstLedger);
};
