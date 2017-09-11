const { NULL_ADDRESS, CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "amount", type: Number },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-buy-info",
    content: "This script displays ETH deposit information that instructs how the Cardstack Foundation can deposit ETH into the CST contract for the purposes of buying back CST."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "amount",
      description: "The amount of ETH to withdraw in units of ETH."
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || !options.amount || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let foundation = await cst.foundation();
  if (foundation === NULL_ADDRESS) {
    console.log(`The foundation address has not been set. Set the foundation address on the CST contract before performing a withdral`);
    callback();
    return;
  }

  let amount = web3.toWei(options.amount, "ether");
  let minimumBalance = await cst.minimumBalance();
  let balance = await web3.eth.getBalance(cst.address);

  if (amount > balance - minimumBalance) {
    console.log(`The CST contract does not have a high enough balance to support this transaction. The maximum withdrawal is currently ${web3.fromWei(balance - minimumBalance, "ether")} ETH.`);
    callback();
    return;
  }

  let data = cst.contract.foundationWithdraw.getData(amount);
  let estimatedGas = web3.eth.estimateGas({
    to: cst.address,
    data
  });
  console.log(`\nTo withdraw ETH from the CST contract, send 0 ETH to the following address with the following data from the wallet with the address ${foundation}:`);
  console.log(`Address: ${cst.address}`);
  console.log(`Data: ${data}`);
  console.log(`Estimated gas: ${estimatedGas}`);

  callback();
};
