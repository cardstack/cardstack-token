const Bluebird = require("bluebird");

const GAS_PRICE = web3.toWei(20, "gwei");
const ROUNDING_ERROR_WEI = 20000;
const MAX_FAILED_TXN_GAS = 5000000;

const DEFAULT_EVENT_WATCH_TIMEOUT_SEC = 60;

// TODO export this from a lib
function asInt(contractValue) {
  if (!contractValue) { throw new Error("Cannot convert to int ", JSON.stringify(contractValue)); }

  return parseInt(contractValue.toString(), 10);
}

function wait(sec) {
  return new Bluebird.Promise(res => setTimeout(() => res(), sec * 1000));
}

async function checkBalance(account, minBalanceEth) {
  let balanceEth = await web3.eth.getBalance(account);
  balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

  if (balanceEth < minBalanceEth) {
    throw new Error(`Not enough ether in address ${account} to perform test--restart testrpc to top-off balance`);
  }
}

function waitForContractEvent(contract, eventName, timeoutSec) {
  timeoutSec = timeoutSec || DEFAULT_EVENT_WATCH_TIMEOUT_SEC;
  return new Bluebird.Promise((resolve, reject) => {
    let event = contract[eventName]();
    let timeout = setTimeout(() => {
      event.stopWatching();
      reject(new Error(`timeout waiting for '${eventName}' after ${timeoutSec} seconds`));
    }, timeoutSec * 1000);

    event.watch((error, log) => {
      clearTimeout(timeout);
      event.stopWatching();
      resolve(log);
    });
  });
}

module.exports = {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance,
  wait,
  waitForContractEvent
};
