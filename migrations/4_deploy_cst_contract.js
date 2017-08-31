let RegistryContract = artifacts.require("./Registry.sol");
let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = async function(deployer) {
  await deployer.deploy(CstLibrary);
  await deployer.link(CstLibrary, CardStackToken);
  await deployer.deploy(CardStackToken);

  let registry = await RegistryContract.deployed();
  let cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");

  await registry.register("cst", cst.address, true);
};
