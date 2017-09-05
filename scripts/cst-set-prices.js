const { CST_NAME } = require("../lib/utils");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "sellPriceEth", type: Number },
  { name: "buyPriceEth", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-set-prices",
    content: "This script specifies the price that people can buy and sell CST from the CST contract."
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
      name: "buyPriceEth",
      description: "The price to purchase 1 CST from the CST contract in units of ethers."
    },{
      name: "sellPriceEth",
      description: "The price to sell 1 CST to the CST contract in units of ethers (current the sell capability is disabled)."
    },{
      name: "registry",
      alias: "r",
      description: "(Optional) The address of the registry. The script will attempt to detect the registry if none is supplied."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.sellPriceEth || !options.buyPriceEth || !options.network || options.help) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let { buyPriceEth, sellPriceEth } = options;

  try {
    console.log(`Setting buy price ${buyPriceEth} ETH and sell price ${sellPriceEth} ETH for CST (${cst.address})...`);
    await cst.setPrices(web3.toWei(sellPriceEth, "ether"), web3.toWei(buyPriceEth, "ether"));
    console.log('done');
  } catch (err) {
    console.error(`Error setting buy and sell price for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
