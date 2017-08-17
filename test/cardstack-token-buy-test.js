const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");

contract('CardStackToken', function(accounts) {
  let ledger;

  describe("buy()", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      for (let i = 0; i < accounts.length; i++) {
        await checkBalance(accounts[i], 1);
      }
    });

    it("should be able to purchase CST", async function() {
      let cst = await CardStackToken.new(ledger.address, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 70000, "Less than 70000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(cstBalance, 2, "The CST balance is correct");
      assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Buy", "The event type is correct");
      assert.equal(event.args.purchasePrice.toString(), txnValue, "The purchase price is correct");
      assert.equal(event.args.value.toString(), "2", "The CST amount is correct");
      assert.equal(event.args.buyer, buyerAccount, "The CST buyer is correct");
      assert.equal(event.args.buyerAccount, buyerAccount, "The CST buyerAccount is correct");
    });

    it("can not purchase more CST than the amount of ethers in the buyers wallet", async function() {
      let cst = await CardStackToken.new(ledger.address, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(1000, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      if (asInt(txnValue) < asInt(startBalance)) {
        throw new Error(`Buyer account ${buyerAccount} has too much value to be able to conduct this test ${startBalance}`);
      }

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than has been minted", async function() {
      let cst = await CardStackToken.new(ledger.address, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(11, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase fractional CST (less than purchase price for a single CST)", async function() {
      let cst = await CardStackToken.new(ledger.address, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(0.9, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the CST sellCap", async function() {
      let cst = await CardStackToken.new(ledger.address, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 5);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(6, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });
  });
});
