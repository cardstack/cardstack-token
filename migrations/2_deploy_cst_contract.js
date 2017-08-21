let CstLibrary = artifacts.require("./CstLibrary.sol");
let ExternalStorage = artifacts.require("./ExternalStorage.sol");
let CstLedger = artifacts.require("./CstLedger.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = function(deployer) {
  deployer.deploy(ExternalStorage);
  deployer.deploy(CstLedger);
  deployer.deploy(CstLibrary);
  deployer.link(CstLibrary, CardStackToken);
  deployer.deploy(CardStackToken);
};
