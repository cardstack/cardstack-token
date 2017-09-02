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

    // There is some kind of race condition in the CST deploy that these
    // promises solve, such that the register works correctly
    await cst.getLedgerNameHash();
    await cst.getStorageNameHash();

    await registry.register("cst", cst.address, true);
  }
};
