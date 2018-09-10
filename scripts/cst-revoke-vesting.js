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
    header: "cst-revoke-vesting",
    content: "This script revokes vesting of CST for the beneficiary the specified address. When a vested grant is revoked after the cliff date, all the vested tokens are released to the beneficiary, and the unvested tokens are returned to the token contract. If the vesting is revoked before the cliff date, then no tokens are released to the beneficiary, and all the tokens are released back to the token contract. Note that you cannot revoke a fully vested token grant."
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
    let data = cst.contract.revokeVesting.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for revoking vested token grant for the beneficiary ${address}, for CST (${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Revoking vested token grant for the beneficiary ${address}, for CST (${cst.address}):`);
    await cst.revokeVesting(address);
    console.log('done');
  } catch (err) {
    console.error(`Error revoking vesting for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
