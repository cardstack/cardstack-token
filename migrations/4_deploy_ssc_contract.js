let SSCContract = artifacts.require("./SoftwareAndServiceCredit.sol");

module.exports = function(deployer) {
  deployer.deploy(SSCContract);
};
