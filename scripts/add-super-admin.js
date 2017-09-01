let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 5) {
    console.error("USAGE: truffle exec ./scripts/add-super-admin.js <admin address>");
    callback();
    return;
  }

  let address = process.argv[4];
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.addSuperAdmin(address);
    console.log(`Added "${address}" as super admin for CST ${cst.address}`);
    await registry.addSuperAdmin(address);
    console.log(`Added "${address}" as super admin for Registry ${registry.address}`);
  } catch (err) {
    console.error(`Error encountered adding super admin, ${err.message}`);
  }

  callback();
};
