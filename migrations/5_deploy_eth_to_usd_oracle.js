let EthToUsdOracle = artifacts.require("./EthToUsdOracle.sol");

module.exports = function(deployer) {
  deployer.deploy(EthToUsdOracle);
};
