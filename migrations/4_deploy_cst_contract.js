const { CST_DEPLOY_GAS_LIMIT, CST_STORAGE_NAME, CST_LEDGER_NAME } = require("../lib/constants.js");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

module.exports = async function(deployer) {
  if (deployer.network === 'development') {
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardStackToken);
  } else {
    let registry = await RegistryContract.deployed();
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardStackToken);
    await deployer.deploy(CardStackToken,
                          registry.address,
                          CST_STORAGE_NAME,
                          CST_LEDGER_NAME,
                          { gas: CST_DEPLOY_GAS_LIMIT });  // need as much gas as possible--this is a big contract
  }
};
