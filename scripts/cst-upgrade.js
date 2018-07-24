const { CST_NAME, CST_DEPLOY_GAS_LIMIT, CST_STORAGE_NAME, CST_LEDGER_NAME } = require("../lib/constants.js");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CstLibrary = artifacts.require("./CstLibrary.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "library", type: String, description: "(optional) The address of the deployed CST Library if you dont intent to deploy a new library." },
  { name: "cst", type: String, description: "(optional) The address of the deployed Cardstack token if you dont intend to deploy a new token contract." },
];

const usage = [
  {
    header: "cst-upgrade",
    content: "This script upgrades the currently deployed contract with a new contract."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let { registry:registryAddress,
        library:libraryAddress,
        cst:cstAddress } = options;

  let registry = await RegistryContract.at(registryAddress);
  console.log(`Using registry at ${registry.address}`);

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

    await CardStackToken.link('CstLibrary', library.address);

    let cardstackToken;
    if (cstAddress) {
      cardstackToken = await CardStackToken.at(cstAddress);
      console.log(`Using Cardstack Token at ${cardstackToken.address}`);
    } else {
      console.log(`Deploying CardstackToken...`);
      cardstackToken = await CardStackToken.new(
        registry.address,
        CST_STORAGE_NAME,
        CST_LEDGER_NAME,
        {
          synchronization_timeout: 0,
          gas: CST_DEPLOY_GAS_LIMIT
        });  // need as much gas as possible--this is a big contract
      console.log(`Deployed new Cardstack Token to ${cardstackToken.address}`);
    }

    let version = await cardstackToken.version();
    await registry.upgradeContract(CST_NAME, cardstackToken.address, {
      gas: CST_DEPLOY_GAS_LIMIT
    });

    console.log(`Completed upgrading to Cardstack token ver ${version}`);

  } catch(err) {
    console.error("Error encountered performing contact upgrade", err);
  }

  callback();
};
