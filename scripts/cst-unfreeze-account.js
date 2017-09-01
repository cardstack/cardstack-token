
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 5) {
    console.error("USAGE: truffle exec ./scripts/cst-unfreeze-account.js <address>");
    callback();
    return;
  }

  let address = process.argv[4];
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.freezeAccount(address, false);
    console.log(`Unfreezing account ${address} for CST (${cst.address})`);
  } catch (err) {
    console.error(`Error unfreezing account for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
