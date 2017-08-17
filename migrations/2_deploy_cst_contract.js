let CstLedger = artifacts.require("./CstLedger.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = function(deployer) {
  deployer.deploy(CstLedger);
  deployer.deploy(CardStackToken);
};
