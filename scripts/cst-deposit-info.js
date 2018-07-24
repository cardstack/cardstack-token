const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "cst", alias: "c", type: String, description: "The token contract address (note we do not use the registry for this)" }
];

const usage = [
  {
    header: "cst-buy-info",
    content: "This script displays ETH deposit information that instructs how the Cardstack Foundation can deposit ETH into the CST contract for the purposes of buying back CST."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.cst) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let { cst:cstAddress } = options;

  console.log(`Using token contract at ${cstAddress}`);
  let cst = await CardStackToken.at(cstAddress);

  let data = cst.contract.foundationDeposit.getData();
  let estimatedGas = web3.eth.estimateGas({
    to: cst.address,
    data
  });
  console.log(`\nTo deposit ETH into the CST contract, send ETH to the following address with the following data:`);
  console.log(`Address: ${cst.address}`);
  console.log(`Data: ${data}`);
  console.log(`Estimated gas: ${estimatedGas}`);

  callback();
};
