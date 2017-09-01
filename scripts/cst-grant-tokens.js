
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 6) {
    console.error("USAGE: truffle exec ./scripts/cst-grant-tokens.js <address> <amount>");
    callback();
    return;
  }

  let address = process.argv[4];
  let amount = parseInt(process.argv[5], 10);
  if (!amount) {
    console.error("Must specify token amount");
    console.error("USAGE: truffle exec ./scripts/cst-grant-tokens.js <address> <amount>");
    callback();
    return;
  }

  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.grantTokens(address, amount);
    console.log(`Granted ${amount} CST to ${address} for CST (${cst.address})`);
  } catch (err) {
    console.error(`Error granting tokens for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
