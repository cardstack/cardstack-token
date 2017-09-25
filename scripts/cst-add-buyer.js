const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
  { name: "maximumBalancePercentage", type: String },
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "cst-add-buyer",
    content: "This script adds a buyer address to the CST buyers whitelist."
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
      description: "The address of the buyer to add"
    },{
      name: "maximumBalancePercentage",
      description: "(OPTIONAL) this is the maximum amount of CST that an account is allowed to posses expressed as a percentage of the buyerPool for the current phase of the token sale, e.g. \"--maximumBalancePercentage=0.2%\". If this value is not specified, the the balance limit will be the default balance limit that is configured for the CST contract. If this value is set to \"0%\" then the limit for this account will leverage the contract default."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    },{
      name: "data",
      alias: "d",
      description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction"
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || (!options.network && !options.data) || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);
  let buyerPool = await cst.cstBuyerPool();
  buyerPool = buyerPool.toNumber();

  let { address, maximumBalancePercentage } = options;
  if (maximumBalancePercentage) {
    maximumBalancePercentage = parseFloat(maximumBalancePercentage.replace("%", "")) / 100;
  }
  let maxBalance = Math.floor(buyerPool * maximumBalancePercentage);

  if (options.data) {
    if (maximumBalancePercentage !== undefined && maximumBalancePercentage !== null) {
      let data = cst.contract.setCustomBuyer.getData(address, maxBalance);
      let estimatedGas = web3.eth.estimateGas({
        to: cst.address,
        data
      });
      console.log(`Data for adding buyer "${address}" with maximumBalancePercentage ${maximumBalancePercentage * 100}% (${maxBalance} CST ) for CST ${cst.address}:`);
      console.log(`\nAddress: ${cst.address}`);
      console.log(`Data: ${data}`);
      console.log(`Estimated gas: ${estimatedGas}`);
    } else {
      let data = cst.contract.addBuyer.getData(address);
      let estimatedGas = web3.eth.estimateGas({
        to: cst.address,
        data
      });
      console.log(`Data for adding buyer "${address}" for CST ${cst.address}:`);
      console.log(`\nAddress: ${cst.address}`);
      console.log(`Data: ${data}`);
      console.log(`Estimated gas: ${estimatedGas}`);
    }

    callback();
    return;
  }

  try {
    if (maximumBalancePercentage !== undefined && maximumBalancePercentage !== null) {
      console.log(`Adding buyer "${address}" with maximumBalancePercentage ${maximumBalancePercentage * 100}% (${maxBalance} CST) for CST ${cst.address}...`);
      await cst.setCustomBuyer(address, maxBalance);
    } else {
      console.log(`Adding buyer "${address}" for CST ${cst.address}...`);
      await cst.addBuyer(address);
    }
    console.log('done');
  } catch (err) {
    console.error(`Error encountered adding buyer, ${err.message}`);
  }

  callback();
};
