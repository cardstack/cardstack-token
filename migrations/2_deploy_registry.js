let RegistryContract = artifacts.require("./Registry.sol");

module.exports = function(deployer) {
  deployer.deploy(RegistryContract);
};
