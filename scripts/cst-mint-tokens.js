const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  return (new web3.BigNumber(value)).mul(decimalsFactor);
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "amount", type: String },
  { name: "rawAmount", type: String },
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "cst-mint-tokens",
    content: "This script mints the specified number of CST tokens."
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
      name: "amount",
      description: "The amount of tokens to mint."
    },{
      name: "rawAmount",
      description: "The amount of tokens to mint without factoring token decimals"
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

  if ((!options.amount && !options.rawAmount) ||
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
  let symbol = await cst.symbol();
  let decimals = await cst.decimals();

  let numOfTokens = options.amount;
  let rawAmountOfTokens = options.rawAmount;

  if (options.data) {
    let data = rawAmountOfTokens ? cst.contract.mintTokens.getData(adjustForDecimals(numOfTokens, decimals)) :
                                   cst.contract.mintTokens.getData(rawAmountOfTokens);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for minting ${rawAmountOfTokens ? rawAmountOfTokens + ' (raw token amount)' : numOfTokens + ' ' + symbol} for CST (${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Minting ${rawAmountOfTokens ? rawAmountOfTokens + ' (raw token amount)' : numOfTokens + ' ' + symbol} for CST (${cst.address})...`);
    if (rawAmountOfTokens) {
      await cst.mintTokens(rawAmountOfTokens);
    } else {
      await cst.mintTokens(adjustForDecimals(numOfTokens, decimals));
    }
    console.log('done');
  } catch (err) {
    console.error(`Error encountered minting tokens for CST (${cst.address}), ${err.message}`);
  }

  callback();
};
