let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 6) {
    console.error("USAGE: truffle exec ./scripts/cst-set-prices.js <buy price in ETH> <sell price in ETH>");
    callback();
    return;
  }

  let buyPriceEth = parseFloat(process.argv[4]);
  let sellPriceEth = parseFloat(process.argv[5]);
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.setPrices(web3.toWei(sellPriceEth, "ether"), web3.toWei(buyPriceEth, "ether"));
    console.log(`Set buy price ${buyPriceEth} ETH and sell price ${sellPriceEth} ETH for CST (${cst.address})`);
  } catch (err) {
    console.error(`Error setting buy and sell price for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
