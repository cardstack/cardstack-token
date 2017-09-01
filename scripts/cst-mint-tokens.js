let CardStackToken = artifacts.require("./CardStackToken.sol");
let RegistryContract = artifacts.require("./Registry.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 5) {
    console.error("USAGE: truffle exec ./scripts/cst-mint-tokens.js <number of tokens>");
    callback();
    return;
  }
  let numOfTokens = parseInt(process.argv[4], 10);
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));

  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.mintTokens(numOfTokens);
    console.log(`Minted ${numOfTokens} for CST (${cst.address}`);
  } catch (err) {
    console.error(`Error encountered minting tokens for CST (${cst.address}), ${err.message}`);
  }

  callback();
};
