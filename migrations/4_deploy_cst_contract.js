let RegistryContract = artifacts.require("./Registry.sol");
let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = async function(deployer) {
  if (deployer.network === 'development') {
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardStackToken);
    await deployer.deploy(CardStackToken);
  } else {
    let registry = await RegistryContract.deployed();
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardStackToken);
    await deployer.deploy(CardStackToken, registry.address, "cstStorage", "cstLedger");

    let cst = await CardStackToken.deployed();

    await registry.register("cst", cst.address, true);
  }
};
