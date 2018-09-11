const commandLineArgs = require('command-line-args');
const { upgradeContract, proxyContract } = require('../lib/proxy');
const getUsage = require('command-line-usage');
const CstLedger = artifacts.require("./CstLedger.sol");
const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "admin", type: String, description: "The address of the proxyAdmin. IMPORTANT: the proxyAdmin is not allowed to invoke functions on the implemented contract!" },
  { name: "proxy", type: String, description: "(optional) The address of the ledger proxy. If no proxy is provided, then one will be created for you." },
];

const usage = [
  {
    header: "deploy-ledger",
    content: "This script creates/upgrades the currently deployed ledger with a new contract."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  let { network,
        help,
        admin:proxyAdmin,
        proxy:proxyAddress, } = commandLineArgs(optionsDefs);

  if (!network || !proxyAdmin || help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  try {
    let ledger;
    if (!proxyAddress) {
      ledger = await proxyContract(
        AdminUpgradeabilityProxy,
        CstLedger,
        proxyAdmin,
        {
          synchronization_timeout: 0,
        });
    } else {
      ledger = await upgradeContract(
        AdminUpgradeabilityProxy,
        CstLedger,
        proxyAdmin,
        proxyAddress,
        {
          synchronization_timeout: 0,
        });
    }

    console.log(`\nCompleted deploying Ledger.
  Ledger implementation address ${ledger.implementation.address}
  Ledger address ${ledger.proxy.address} (proxy)`);

  } catch(err) {
    console.error("Error encountered performing contact upgrade", err);
  }

  callback();
};
