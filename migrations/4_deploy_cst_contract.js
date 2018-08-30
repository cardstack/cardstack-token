const { CST_DEPLOY_GAS_LIMIT, CST_STORAGE_NAME, CST_LEDGER_NAME } = require("../lib/constants.js");
let RegistryContract = artifacts.require("./Registry.sol");
let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");
let TestingCardstackToken = artifacts.require("./TestingCardstackToken.sol");
let Token_v1 = artifacts.require("./Token_v1.sol");
let Token_v2 = artifacts.require("./Token_v2.sol");

module.exports = async function(deployer) {
  if (deployer.network === 'development') {
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardstackToken);

    // for tests only
    await deployer.link(CstLibrary, TestingCardstackToken);
    await deployer.link(CstLibrary, Token_v1);
    await deployer.link(CstLibrary, Token_v2);
  } else {
    let registry = await RegistryContract.deployed();
    await deployer.deploy(CstLibrary);
    await deployer.link(CstLibrary, CardstackToken);
    await deployer.deploy(CardstackToken,
                          registry.address,
                          CST_STORAGE_NAME,
                          CST_LEDGER_NAME,
                          { gas: CST_DEPLOY_GAS_LIMIT });  // need as much gas as possible--this is a big contract
  }
};
