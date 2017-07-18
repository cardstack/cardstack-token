let CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(accounts) {
  it("should initialize the CST correctly", async function() {
    let cst = await CardStackToken.new(10000, "CardStack Token", 0, "CST");
    let balance = await cst.balanceOf(accounts[0]);
    let name = await cst.name();
    let symbol = await cst.symbol();
    let circulation = await cst.totalSupply();

    assert.equal(name, "CardStack Token", "The name of the token is correct");
    assert.equal(symbol, "CST", "The symbol of the token is correct");
    assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    assert.equal(circulation, 10000, "The totalSupply is correct");
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
