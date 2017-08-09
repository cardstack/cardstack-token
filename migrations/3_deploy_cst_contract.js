let SafeMath = artifacts.require("./open-zepplin/math/SafeMath.sol");
let CardStackToken = artifacts.require("./CardSTackToken.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, CardStackToken);
  deployer.deploy(CardStackToken);
};
