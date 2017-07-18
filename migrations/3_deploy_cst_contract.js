let ConvertLib = artifacts.require("./ConvertLib.sol");
let CardStackToken = artifacts.require("./CardSTackToken.sol");

module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, CardStackToken);
  deployer.deploy(CardStackToken);
};
