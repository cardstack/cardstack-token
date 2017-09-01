
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const cstRegistryName = 'cst';

module.exports = async function(callback) {
  if (process.argv.length < 5) {
    console.error("USAGE: truffle exec ./scripts/cst-set-sell-cap.js <num of tokens>");
    callback();
    return;
  }

  let sellCap = parseInt(process.argv[4], 10);
  let registry = await RegistryContract.deployed();
  let cstAddress = await registry.contractForHash(web3.sha3(cstRegistryName));
  let cst = await CardStackToken.at(cstAddress);

  try {
    await cst.setSellCap(sellCap);
    console.log(`Set sell cap to ${sellCap} tokens for CST (${cst.address})`);
  } catch (err) {
    console.error(`Error setting sell cap for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
