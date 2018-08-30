const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

let RegistryContract = artifacts.require("./Registry.sol");
let CardstackToken = artifacts.require("./CardstackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean, description: "Print this usage guide." },
  { name: "network", type: String, description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`." },
  { name: "address", alias: "a", type: String, description: "The address to grant admin permissions"},
  { name: "registry", alias: "r", type: String, description: "The address of the registry." },
  { name: "data", alias: "d", type: Boolean, description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction" }
];

const usage = [
  {
    header: "cst-release-vested-tokens",
    content: "This script releases vested tokens for the specified beneficiary. Any vested tokens that have not yet been placed into the benefieicary's account will be transfered to the beneficary's account aafter this script is run."
  },{
    header: "Options",
    optionList: optionsDefs
  }
];

module.exports = async function(callback) {
  let { network,
        address,
        registry,
        data,
        help } = commandLineArgs(optionsDefs);

  if (!address ||
     !network ||
     help ||
     !registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryContract = await RegistryContract.at(registry);

  console.log(`Using registry at ${registryContract.address}`);
  let cstAddress = await registryContract.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardstackToken.at(cstAddress);

  if (data) {
    let data = cst.contract.releaseVestedTokensForBeneficiary.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });

    // the estimated gas calculations for this txn are way off...
    estimatedGas = 200000;

    console.log(`Data for releasing vested tokens for the beneficiary ${address}, for CST (${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Releasing vested tokens for the beneficiary ${address}, for CST (${cst.address}):`);
    await cst.releaseVestedTokensForBeneficiary(address);
    console.log('done');
  } catch (err) {
    console.error(`Error releasing vested tokens for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
