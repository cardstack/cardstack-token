const GAS_PRICE = 20000000000;
let CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(accounts) {
  beforeEach(async function() {
    for (let i = 0; i < accounts.length; i++) {
      let account = accounts[i];
      let balanceEth = await web3.eth.getBalance(account);
      balanceEth = parseFloat(web3.fromWei(balanceEth.toString(), 'ether'));

      if (balanceEth < 1) {
        throw new Error(`Not enough ether in address ${address} to perform test--restart testrpc to top-off balance`);
      }
    }
  });

  it("should initialize the CST correctly", async function() {
    let cst = await CardStackToken.new(10000, "CardStack Token", "CST", 2, 1);
    let balance = await cst.balanceOf(accounts[0]);
    let name = await cst.name();
    let symbol = await cst.symbol();
    let supply = await cst.totalSupply();
    let buyPrice = await cst.buyPrice();
    let sellPrice = await cst.sellPrice();
    let totalInCirculation = await cst.totalInCirculation();

    assert.equal(name, "CardStack Token", "The name of the token is correct");
    assert.equal(symbol, "CST", "The symbol of the token is correct");
    assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    assert.equal(supply, 10000, "The totalSupply is correct");
    assert.equal(totalInCirculation, 0, "The totalInCirculation is correct");
    assert.equal(buyPrice, 2, "The buyPrice is correct");
    assert.equal(sellPrice, 1, "The sellPrice is correct");
  });

  it.only("should be able to purchase CST", async function() {
    let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"));
    let buyerAccount = accounts[1];
    let txnValue = web3.toWei(2, "ether");
    let startBalance = await web3.eth.getBalance(buyerAccount);

    startBalance = parseInt(startBalance.toString(), 10);

    let txn = await cst.buy({
      from: buyerAccount,
      value: txnValue
    });

    // console.log("TXN", JSON.stringify(txn, null, 2));
    assert.ok(txn.receipt);
    assert.ok(txn.logs);

    let { cumulativeGasUsed } = txn.receipt;
    let endBalance = await web3.eth.getBalance(buyerAccount);
    let cstBalance = await cst.balanceOf(buyerAccount);
    let supply = await cst.totalSupply();
    let totalInCirculation = await cst.totalInCirculation();

    endBalance = parseInt(endBalance.toString(), 10);

    assert.ok(cumulativeGasUsed < 70000, "Less than 70000 gas was used for the txn");
    assert.ok(startBalance - endBalance - parseInt(txnValue, 10) < 0.005 * parseInt(txnValue, 10), "Buyer's account debited correctly, with gas price not exceeding 0.5% of txn value");
    assert.equal(cstBalance, 2, "The CST balance is correct");
    assert.equal(supply, 8, "The CST total supply was updated correctly");
    assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");

    assert.equal(txn.logs.length, 1, "The correct number of events were fired");

    let event = txn.logs[0];
    assert.equal(event.event, "Buy", "The event type is correct");
    assert.equal(event.args.purchasePrice.toString(), txnValue, "The purchase price is correct");
    assert.equal(event.args.value.toString(), "2", "The CST balance is correct");
    assert.equal(event.args.buyer, buyerAccount, "The CST buyer is correct");
  });

  it("can not purchase more CST than has been minted", async function() {
  });

/*
  it("should call a function that depends on a linked library", function() {
    let cst;
    let cstCoinBalance;
    let cstCoinEthBalance;

    return CardStackToken.deployed().then(function(instance) {
      cst = instance;
      return cst.getBalance.call(accounts[0]);
    }).then(function(outCoinBalance) {
      cstCoinBalance = outCoinBalance.toNumber();
      return cst.getBalanceInEth.call(accounts[0]);
    }).then(function(outCoinBalanceEth) {
      cstCoinEthBalance = outCoinBalanceEth.toNumber();
    }).then(function() {
      assert.equal(cstCoinEthBalance, 2 * cstCoinBalance, "Library function returned unexpected function, linkage may be broken");
    });
  });

  it("should send coin correctly", function() {
    let cst;

    // Get initial balances of first and second account.
    let account_one = accounts[0];
    let account_two = accounts[1];

    let account_one_starting_balance;
    let account_two_starting_balance;
    let account_one_ending_balance;
    let account_two_ending_balance;

    let amount = 10;

    return CardStackToken.deployed().then(function(instance) {
      cst = instance;
      return cst.getBalance.call(account_one);
    }).then(function(balance) {
      account_one_starting_balance = balance.toNumber();
      return cst.getBalance.call(account_two);
    }).then(function(balance) {
      account_two_starting_balance = balance.toNumber();
      return cst.sendCoin(account_two, amount, {from: account_one});
    }).then(function() {
      return cst.getBalance.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();
      return cst.getBalance.call(account_two);
    }).then(function(balance) {
      account_two_ending_balance = balance.toNumber();

      assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender");
      assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver");
    });
  });
  */
});
