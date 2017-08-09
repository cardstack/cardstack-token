let SafeMath = artifacts.require("./open-zepplin/math/SafeMath.sol");
let CardStackToken = artifacts.require("./CardSTackToken.sol");
let EthToUsdOracle = artifacts.require("./EthToUsdOracle.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, CardStackToken);
  deployer.deploy(CardStackToken);

  deployer.deploy(EthToUsdOracle);
};
