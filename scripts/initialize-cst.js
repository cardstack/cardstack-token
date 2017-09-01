let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 10) {
    console.error("USAGE: truffle exec ./scripts/initialize.js <token name> <token symbol> <buy price in ETH> <sell price in ETH> <sell cap> <foundation address>");
    callback();
    return;
  }

  const [ , , , , tokenName, tokenSymbol, buyPriceEth, sellPriceEth, sellCap, foundation ] = process.argv;

  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  console.log(`Initializing CST token:
  token name: ${tokenName}
  token symbol: ${tokenSymbol}
  buy price (ETH): ${buyPriceEth}
  sell price: (ETH): ${sellPriceEth}
  sell cap: ${sellCap}
  foundation address: ${foundation}`);


  try {
    await cst.initialize(web3.toHex(tokenName),
                         web3.toHex(tokenSymbol),
                         web3.toWei(parseFloat(buyPriceEth), "ether"),
                         web3.toWei(parseFloat(sellPriceEth), "ether"),
                         parseInt(sellCap, 10),
                         foundation ? foundation : NULL_ADDRESS);
    console.log(`\nCST token is live at ${cst.address}`);
  } catch (err) {
    console.error(`\nError encountered initializing CST, ${err.message}`);
  }

  callback();
};
