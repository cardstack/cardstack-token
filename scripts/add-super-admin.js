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
    header: "add-super-admin",
    content: "This script adds a super admin to the CST and Registry."
  },{
    header: "Options",
    optionList: optionsDefs
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

  let cst = await CardstackToken.at(cstAddress);

  let address = options.address;

  if (options.data) {
    let data = cst.contract.addSuperAdmin.getData(address);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for adding "${address}" as super admin for CST ${cst.address}...`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);

    data = registry.contract.addSuperAdmin.getData(address);
    estimatedGas = web3.eth.estimateGas({
      to: registry.address,
      data
    });
    console.log(`\n Data for adding "${address}" as super admin for Regsitry ${registry.address}...`);
    console.log(`\nAddress: ${registry.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Adding "${address}" as super admin for CST ${cst.address}...`);
    await cst.addSuperAdmin(address);
    console.log(`Adding "${address}" as super admin for Registry ${registry.address}...`);
    await registry.addSuperAdmin(address);
    console.log('done');
  } catch (err) {
    console.error(`Error encountered adding super admin, ${err.message}`);
  }

  callback();
};
