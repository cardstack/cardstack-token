const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

function adjustForDecimals(value, decimals) {
  let decimalsFactor = new web3.BigNumber('1'.padEnd(decimals.toNumber() + 1, '0'));
  let resultBN = (new web3.BigNumber(value)).mul(decimalsFactor);
  let [ result ]  = resultBN.toPrecision(40).toString().split('.');
  return result;
}

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "amount", type: String, description: "The amount of CST tokens to grant." },
  { name: "rawAmount", type: String, description: "The amount of tokens to mint without factoring token decimals" },
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "cst-grant-tokens",
    content: "This script grants tokens to the specified address"
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.address || (!options.amount && !options.rawAmount) || !options.network || options.help || !options.registry) {
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

  let { address, amount, rawAmount } = options;

  if (options.data) {
    let data = !rawAmount ? cst.contract.grantTokens.getData(address, adjustForDecimals(amount, decimals)) :
                            cst.contract.grantTokens.getData(address, rawAmount);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for granting ${rawAmount ? rawAmount + ' (raw token amount)' : amount + ' ' + symbol} to ${address} for CST (${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Granting ${rawAmount ? rawAmount + ' (raw token amount)' : amount + ' ' + symbol} to ${address} for CST (${cst.address})...`);
    if (rawAmount) {
      await cst.grantTokens(address, rawAmount);
    } else {
      await cst.grantTokens(address, adjustForDecimals(amount, decimals));
    }
    console.log('done');
  } catch (err) {
    console.error(`Error granting tokens for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
