const { CST_DEPLOY_GAS_LIMIT, CST_STORAGE_NAME, CST_LEDGER_NAME } = require("../lib/constants.js");
const { upgradeContract, proxyContract } = require('../lib/proxy');
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const CstLibrary = artifacts.require("./CstLibrary.sol");
const CardstackToken = artifacts.require("./CardstackToken.sol");
const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "registry", alias: "r", type: String, description: "This value is necessary then the 'proxy' argument is not supplied. The address of the registry." },
  { name: "admin", type: String, description: "The address of the proxyAdmin. IMPORTANT: the proxyAdmin is not allowed to invoke functions on the implemented contract!" },
  { name: "proxy", type: String, description: "(optional) The address of the cardstack token proxy. If no proxy is provided, then one will be created for you." },
  { name: "library", type: String, description: "(optional) The address of the deployed CST Library if you dont intent to deploy a new library." },
];

const usage = [
  {
    header: "deploy-cst",
    content: "This script creates/upgrades the currently deployed token contract with a new contract."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  let { network,
        help,
        registry,
        admin:proxyAdmin,
        proxy:proxyAddress,
        library:libraryAddress } = commandLineArgs(optionsDefs);

  if (!network || !proxyAdmin || !(registry || proxyAdmin) || help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  try {
    let library;
    if (libraryAddress) {
      library = await CstLibrary.at(libraryAddress);
      console.log(`Using CstLibrary at ${library.address}`);
    } else {
      console.log(`Deploying CstLibrary...`);
      library = await CstLibrary.new({ synchronization_timeout: 0 });
      console.log(`Deployed CstLibrary to ${library.address}`);
    }

    await CardstackToken.link('CstLibrary', library.address);

    let cardstackToken;
    if (!proxyAddress) {
      cardstackToken = await proxyContract(
        AdminUpgradeabilityProxy,
        CardstackToken,
        proxyAdmin,
        registry,
        CST_STORAGE_NAME,
        CST_LEDGER_NAME,
        {
          synchronization_timeout: 0,
          gas: CST_DEPLOY_GAS_LIMIT
        });  // need as much gas as possible--this is a big contract
    } else {
      cardstackToken = await upgradeContract(
        AdminUpgradeabilityProxy,
        CardstackToken,
        proxyAdmin,
        proxyAddress,
        {
          synchronization_timeout: 0,
          gas: CST_DEPLOY_GAS_LIMIT
        });  // need as much gas as possible--this is a big contract
    }

    console.log(`\nCompleted deploying Cardstack token.
  Cardstack token implementation address ${cardstackToken.contract.address}
  Cardstack token address ${cardstackToken.proxy.address} (proxy)`);

  } catch(err) {
    console.error("Error encountered performing contact upgrade", err);
  }

  callback();
};
