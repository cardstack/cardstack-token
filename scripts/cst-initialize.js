const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "tokenName", type: String },
  { name: "tokenSymbol", type: String },
  { name: "buyPriceEth", type: Number },
  { name: "sellPriceEth", type: Number },
  { name: "sellCap", type: Number },
  { name: "foundation", type: String },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-initialize",
    content: "This script initializes the CST token and makes it available for purchase."
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
      name: "tokenName",
      description: "The ERC-20 token full name."
    },{
      name: "tokenSymbol",
      description: "The ERC-20 token symbol."
    },{
      name: "buyPriceEth",
      description: "The price to purchase 1 CST from the CST contract in units of ethers."
    },{
      name: "sellPriceEth",
      description: "The price to sell 1 CST to the CST contract in units of ethers (current the sell capability is disabled)."
    },{
      name: "sellCap",
      description: "The maximum number of CST that can be purchased from the CST contract. (This is used to set the maximum number of CST avialable for each phase of CST purchase.)"
    },{
      name: "foundation",
      description: "The address of the CST Foundation, which has the ability to deposit and withdraw ETH against the CST contract."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];
module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);
  let { tokenName,
        tokenSymbol,
        buyPriceEth,
        sellPriceEth,
        sellCap,
        foundation } = options;

  if (!tokenName ||
      !tokenSymbol ||
      !buyPriceEth ||
      !sellPriceEth ||
      !sellCap ||
      !foundation ||
      !options.network ||
      options.help ||
      !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  console.log(`Initializing CST token:
  token name: ${tokenName}
  token symbol: ${tokenSymbol}
  buy price (ETH): ${buyPriceEth}
  sell price: (ETH): ${sellPriceEth}
  sell cap: ${sellCap}
  foundation address: ${foundation}`);
  console.log("...");

  try {
    await cst.initialize(web3.toHex(tokenName),
                         web3.toHex(tokenSymbol),
                         web3.toWei(parseFloat(buyPriceEth), "ether"),
                         web3.toWei(parseFloat(sellPriceEth), "ether"),
                         parseInt(sellCap, 10),
                         foundation);
    console.log(`\nCST token is live at ${cst.address}`);
  } catch (err) {
    console.error(`\nError encountered initializing CST (${cst.address}), ${err.message}`);
  }

  callback();
};
