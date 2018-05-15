const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");

const { CST_NAME } = require("../lib/constants");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-whitelist-info",
    content: "This script displays the whitelisting info for the CST token contract."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "address",
      alias: "a",
      description: "(optional) address to get whitelisting info"
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;
  let queryAddress = options.address;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);

  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));
  let cst = await CardStackToken.at(cstAddress);
  let cstSymbol = await cst.symbol();
  let cstBuyerCount = await cst.totalBuyersMapping();
  let cstCustomBuyerCount = await cst.totalCustomBuyersMapping();
  let cstBalanceLimit = await cst.cstBalanceLimit();

  if (!queryAddress) {
    console.log(`
Cardstack Token (${cst.address}):
  CST Buyers with custom balance limit:`);
    for (let i = 0; i < cstCustomBuyerCount; i++) {
      let address = await cst.customBuyerForIndex(i);
      let limit = await cst.customBuyerLimit(address);
      limit = limit.toNumber();
      if (limit) {
        console.log(`    ${address}: ${limit} ${cstSymbol}`);
      }
    }
    console.log(`
  CST Buyers (with the default balance limit of ${cstBalanceLimit} ${cstSymbol}):`);
    for (let i = 0; i < cstBuyerCount; i++) {
      let address = await cst.approvedBuyerForIndex(i);
      let isBuyer = await cst.approvedBuyer(address);
      if (isBuyer) {
        console.log(`    ${address}`);
      }
    }
  } else {
    console.log(`
Cardstack Token (${cst.address}):`);
    let isBuyer = await cst.approvedBuyer(queryAddress);
    let cstBalanceLimit = await cst.cstBalanceLimit();
    let limit = await cst.customBuyerLimit(queryAddress);
    limit = limit.toNumber();

    if (isBuyer) {
      if (limit) {
        console.log(`    ${queryAddress}: is whitelisted with custom cap of ${limit} ${cstSymbol}`);
      } else {
        console.log(`    ${queryAddress}: is whitelisted with default cap of ${cstBalanceLimit} ${cstSymbol}`);
      }
    } else {
      console.log(`  The address ${queryAddress} is not a whitelisted buyer`);
    }
  }

  callback();
};
