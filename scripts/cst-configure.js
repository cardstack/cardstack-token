const { CST_NAME, NULL_ADDRESS } = require("../lib/constants");
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
  { name: "buyerPool", type: Number },
  { name: "maximumBalancePercentage", type: String },
  { name: "maximumBalance", type: Number },
  { name: "foundation", type: String },
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "cst-configure",
    content: "This script configures the CST token and makes it available for purchase."
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
      name: "buyerPool",
      description: "The maximum number of CST that are available to be purchased in the current phase of the CST token sale. This is the amount from which the maximum balance percentage is calculated."
    },{
      name: "maximumBalancePercentage",
      description: "this is the maximum amount of CST that an account is allowed to posses expressed as a percentage of the buyerPool for the current phase of the token sale, e.g. \"--maximumBalancePercentage=0.2%\""
    },{
      name: "maximumBalance"
      description: "this is the maximum amount of CST that an account is allowed to posses expressed as number of CST"
    },{
      name: "foundation",
      description: "(optional) The address of the CST Foundation, which has the ability to deposit and withdraw ETH against the CST contract."
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
  let { tokenName,
        tokenSymbol,
        buyPriceEth,
        sellPriceEth,
        buyerPool,
        maximumBalancePercentage,
        sellCap,
        foundation } = options;

  if (maximumBalancePercentage) {
    maximumBalancePercentage = parseFloat(maximumBalancePercentage.replace("%", "")) / 100;
  }

  if (!tokenName ||
      !tokenSymbol ||
      !buyPriceEth ||
      !sellPriceEth ||
      !sellCap ||
      !options.network ||
      !buyerPool ||
      (!maximumBalancePercentage && !maximumBalance) ||
      options.help ||
      !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;
  foundation = foundation || NULL_ADDRESS;

  let maxBalance;
  if (maximumBalancePercentage) {
    maxBalance = Math.floor(buyerPool * maximumBalancePercentage);
  } else if (maximumBalance && buyerPool) {
    maxBalance = maximumBalance;
    maximumBalancePercentage = Math.round(maximumBalance * 100 / buyerPool ) / 100;
  }

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
  buyer pool: ${buyerPool}
  maximum balance percentage: ${maximumBalancePercentage * 100}% (${maxBalance} CST)
  foundation address: ${foundation}`);

  if (options.data) {
    let data = cst.contract.configure.getData(web3.toHex(tokenName),
                                              web3.toHex(tokenSymbol),
                                              web3.toWei(parseFloat(buyPriceEth), "ether"),
                                              web3.toWei(parseFloat(sellPriceEth), "ether"),
                                              sellCap,
                                              buyerPool,
                                              maxBalance,
                                              foundation);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`\nData for configuring token CST(${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  console.log("\n...\n");
  try {
    await cst.configure(web3.toHex(tokenName),
                        web3.toHex(tokenSymbol),
                        web3.toWei(parseFloat(buyPriceEth), "ether"),
                        web3.toWei(parseFloat(sellPriceEth), "ether"),
                        sellCap,
                        buyerPool,
                        maxBalance,
                        foundation);
    console.log("done");
  } catch (err) {
    console.error(`\nError encountered initializing CST (${cst.address}), ${err.message}`);
  }

  callback();
};
