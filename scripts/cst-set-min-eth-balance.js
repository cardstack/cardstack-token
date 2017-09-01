
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 5) {
    console.error("USAGE: truffle exec ./scripts/cst-set-min-eth-balance.js <minimum balance (ETH) in CST contract>");
    callback();
    return;
  }

  let minimumBalance = parseInt(process.argv[4], 10);
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.setMinimumBalance(web3.toWei(minimumBalance, "ether"));
    console.log(`Set minimum balance to ${minimumBalance} ETH for CST (${cst.address})`);
  } catch (err) {
    console.error(`Error setting minimum balance for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
