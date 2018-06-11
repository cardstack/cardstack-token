const { CST_NAME } = require("../lib/constants");
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
  { name: "address", alias: "a", type: String },
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
      name: "maxBalance",
      description: "(OPTIONAL) this is the maximum amount of tokens that an account is allowed to posses expressed as number of CST. Set this to 0 to turn off a custom cap for a buy and revert to the default token cap"
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
  let decimals = await cst.decimals();
  let symbol = await cst.symbol();
  let buyPriceTokensPerEth = await cst.buyPrice();
  let sigDigits = 6;
  let cstBalanceLimit = await cst.cstBalanceLimit();
  let tokenMaxBalanceEth = !cstBalanceLimit.toNumber() ? 0 :  Math.round(cstBalanceLimit.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerEth).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;
  let tokenMaxBalance = adjustForDecimals(maxBalance || cstBalanceLimit, decimals);


  let { address, maxBalance, maxBalanceEth } = options;
  let useTokenMaxBalance;
  if (maxBalance === 0 || maxBalanceEth === 0) {
    useTokenMaxBalance = true;
  }

  if (!useTokenMaxBalance) {
    maxBalanceEth = Math.round(maxBalance.div(new web3.BigNumber(('1'.padEnd(decimals.toNumber() + 1, '0')))).div(buyPriceTokensPerEth).toNumber() * 10 ** sigDigits) / 10 ** sigDigits;
  }

  if (options.data) {
    if (maxBalance) {
      let data = cst.contract.setCustomBuyer.getData(address, maxBalance);
      let estimatedGas = web3.eth.estimateGas({
        to: cst.address,
        data
      });
      console.log(`Data for adding buyer "${address}" with ${useTokenMaxBalance ? 'token default ' : ''}maximum balance ${useTokenMaxBalance ? tokenMaxBalanceEth : maxBalanceEth} ETH (${useTokenMaxBalance ? tokenMaxBalance : maxBalance} ${symbol}) for CST ${cst.address}:`);
      console.log(`\nAddress: ${cst.address}`);
      console.log(`Data: ${data}`);
      console.log(`Estimated gas: ${estimatedGas}`);
    } else {
      let data = cst.contract.addBuyer.getData(address);
      let estimatedGas = web3.eth.estimateGas({
        to: cst.address,
        data
      });
      console.log(`Data for adding buyer "${address}" with token default maximum balace of ${tokenMaxBalanceEth} ETH (${tokenMaxBalance} ${symbol}) for CST ${cst.address}:`);
      console.log(`\nAddress: ${cst.address}`);
      console.log(`Data: ${data}`);
      console.log(`Estimated gas: ${estimatedGas}`);
    }

    callback();
    return;
  }

  try {
    if (maxBalance) {
      console.log(`Adding buyer "${address}" with ${useTokenMaxBalance ? 'token default ' : ''}maximum balance ${useTokenMaxBalance ? tokenMaxBalanceEth : maxBalanceEth} ETH (${useTokenMaxBalance ? tokenMaxBalance : maxBalance} ${symbol}) for CST ${cst.address}...`);
      await cst.setCustomBuyer(address, maxBalance);
    } else {
      console.log(`Adding buyer "${address}" with token default maximum balace of ${tokenMaxBalanceEth} ETH (${tokenMaxBalance} ${symbol}) for CST ${cst.address}...`);
      await cst.addBuyer(address);
    }
    console.log('done');
  } catch (err) {
    console.error(`Error encountered adding buyer, ${err.message}`);
  }

  callback();
};

