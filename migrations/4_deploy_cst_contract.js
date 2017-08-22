let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = function(deployer) {
  deployer.deploy(CstLibrary);
  deployer.link(CstLibrary, CardStackToken);
  deployer.deploy(CardStackToken);
};
