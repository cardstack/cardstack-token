let CstRewards = artifacts.require("./CstRewards.sol");

module.exports = function(deployer) {
  deployer.deploy(CstRewards);
};
