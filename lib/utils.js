const GAS_PRICE = web3.toWei(20, "gwei");
const ROUNDING_ERROR_WEI = 20000;
const MAX_FAILED_TXN_GAS = 5000000;

// TODO export this from a lib
function asInt(contractValue) {
  if (!contractValue) { throw new Error("Cannot convert to int ", JSON.stringify(contractValue)); }

  return parseInt(contractValue.toString(), 10);
}

async function checkBalance(account, minBalanceEth) {
  let balanceEth = await web3.eth.getBalance(account);
  balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

  if (balanceEth < minBalanceEth) {
    throw new Error(`Not enough ether in address ${account} to perform test--restart testrpc to top-off balance`);
  }
}

module.exports = {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance
};
