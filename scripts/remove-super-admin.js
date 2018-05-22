const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", alias: "a", type: String },
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "remove-super-admin",
    content: "This script removes a super admin from the CST and Registry."
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
      description: "The address of the revoked super admin"
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

  if (!options.address || !options.network || options.help || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let address = options.address;

  if (options.data) {
    let data = cst.contract.removeSuperAdmin.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for removing "${address}" as super admin for CST ${cst.address}:`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);

    data = registry.contract.removeSuperAdmin.getData(address);
    estimatedGas = web3.eth.estimateGas({
      to: registry.address,
      data
    });

    console.log(`\nData for removing "${address}" as super admin for Registry ${registry.address}:`);
    console.log(`\nAddress: ${registry.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);

    callback();
    return;
  }

  try {
    console.log(`Removing "${address}" as super admin for CST ${cst.address}...`);
    await cst.removeSuperAdmin(address);
    console.log(`Removing "${address}" as super admin for Registry ${registry.address}...`);
    await registry.addSuperAdmin(address);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered removing super admin, ${err.message}`);
  }

  callback();
};
