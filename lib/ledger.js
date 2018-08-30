const { NULL_ADDRESS } = require("./constants");

function constructLedger(web3, transactions, contractAddress) {
  let ledger = {};
  for (let txn of transactions) {
    let { _to:to, _from:from, _value:amount } = txn.args;

    if (from.toLowerCase() !== contractAddress.toLowerCase() && from !== NULL_ADDRESS) {
      let balance = new web3.BigNumber(ledger[from] || 0);
      ledger[from] = balance.sub(new web3.BigNumber(amount));
    }

    if (to.toLowerCase() !== contractAddress.toLowerCase() && to !== NULL_ADDRESS) {
      let balance = new web3.BigNumber(ledger[to] || 0);
      ledger[to] = balance.add(new web3.BigNumber(amount));
    }
  }

  for (let account of Object.keys(ledger)) {
    if (ledger[account].isZero()) {
      delete ledger[account];
    } else if (ledger[account].isNegative()) {
      throw new Error(`account ${account} has a negative balance ${ledger[account].toString()}`);
    }
  }

  return ledger;
}

async function getLedger(web3, contractInstance) {
  let ledger = await new Promise((res, rej) => {
    contractInstance.contract.Transfer({}, { fromBlock: 0, toBlock: 'latest'}).get((err, events) => {
      console.log(`Processing ${events.length} Transfer events...`);
      if (err) {
        rej(err);
      } else {
        res(constructLedger(web3, events, contractInstance.address));
      }
    });
  });

  ledger = ledger || {};

  return ledger;
}

module.exports = {
  getLedger
};
