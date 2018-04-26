const {
  CST_NAME,
  CST_STORAGE_NAME,
  CST_LEDGER_NAME,
  CST_DEPLOY_GAS_LIMIT,
  CST_BUY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
} = require("./constants");

const Bluebird = require("bluebird");
const GAS_PRICE = web3.toWei(20, "gwei");
const DEFAULT_EVENT_WATCH_TIMEOUT_SEC = 60;

function asInt(contractValue) {
  if (!contractValue) { throw new Error("Cannot convert to int ", JSON.stringify(contractValue)); }
  if (typeof contractValue.toNumber === "function") {
    return contractValue.toNumber();
  }

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

async function assertRevert(block, msg) {
  let err;
  try {
    await block();
  } catch (e) {
    err = e;
  }

  if (!err) { return assert.isOk(err, "Revert should have been fired, instead no error fired"); }

  if (msg) {
    return assert.isOk(err.message.search(msg) > -1,
                       msg + " should have been fired, instead:" + err.message);
  } else {
    return assert.isOk(err.message.search("revert") > -1,
                       "revert should have been fired, instead:" + err.message);
  }
}

module.exports = {
  GAS_PRICE,
  CST_DEPLOY_GAS_LIMIT,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  CST_NAME,
  CST_STORAGE_NAME,
  CST_LEDGER_NAME,
  CST_BUY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
  asInt,
  checkBalance,
  wait,
  waitForContractEvent
};
