const { CST_NAME, NULL_ADDRESS } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).mul(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "tokenName", type: String },
  { name: "tokenSymbol", type: String },
  { name: "buyPriceCardPerEth", type: Number },
  { name: "circulationCap", type: Number },
  { name: "maxBalance", type: Number },
  { name: "foundation", type: String },
  { name: "registry", alias: "r", type: String },
  { name: "force", type: Boolean },
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
      name: "force",
      description: "(optional) Specify the `--force` parameter to configure an unfrozen contract. For price changes, the token must be frozen in order to change the price."
    },{
      name: "buyPriceCardPerEth",
      description: "The price of CST expressed as the amount of CST that you can purchase for 1 ETH"
    },{
      name: "circulationCap",
      description: "The maximum number of CST that is allowed to be in circluation at any point in time (this includes unvested tokens)"
    },{
      name: "maxBalance",
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
        buyPriceCardPerEth,
        maxBalance,
        force,
        circulationCap,
        foundation } = options;

  if (!tokenName ||
      !tokenSymbol ||
      !buyPriceCardPerEth ||
      !circulationCap ||
      !options.network ||
      !maxBalance ||
      options.help ||
      !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;
  foundation = foundation || NULL_ADDRESS;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);
  let isFrozen = await cst.frozenToken();
  let decimals = await cst.decimals();

  if (!isFrozen) {
    if (!force) {
      console.log("WARNING: Token is not frozen. Token must be frozen in order to make price changes. Use `--force` to configure the token without freezing it.");
      callback();
      return;
    } else {
      console.log("WARNING: Token is not frozen, force-changing the token configuration. Note that price changes are not allowed when the token is not frozen.\n");
    }
  }

  console.log(`Configuring CST token:
  token name: ${tokenName}
  token symbol: ${tokenSymbol}
  buy price: ${tokenSymbol} per ETH: ${buyPriceCardPerEth}
  circulation cap: ${circulationCap}
  maximum balance: ${maxBalance}
  foundation address: ${foundation}`);

  if (options.data) {
    let data = cst.contract.configure.getData(web3.toHex(tokenName),
                                              web3.toHex(tokenSymbol),
                                              buyPriceCardPerEth, // since decimals is 18, this eactly matches cardPerWei when decimals is taken into account
                                              adjustForDecimals(circulationCap, decimals),
                                              adjustForDecimals(maxBalance, decimals),
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
                        buyPriceCardPerEth, // since decimals is 18, this eactly matches cardPerWei when decimals is taken into account
                        adjustForDecimals(circulationCap, decimals),
                        adjustForDecimals(maxBalance, decimals),
                        foundation);
    console.log("done");
  } catch (err) {
    console.error(`\nError encountered initializing CST (${cst.address}), ${err.message}`);
  }

  callback();
};
