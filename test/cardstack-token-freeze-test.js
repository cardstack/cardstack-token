const {
  GAS_PRICE,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(accounts) {

  describe("frozen account", function() {
    let cst;
    let frozenAccount = accounts[5];

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      await checkBalance(frozenAccount, 1);

      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      await cst.freezeAccount(frozenAccount, true);
    });

    it("cannot sell CST when frozen", async function() {
      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
      startBalance = asInt(startBalance);

      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot buy CST when frozen", async function() {
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 80, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("can unfreeze an account", async function() {
      await cst.freezeAccount(frozenAccount, false);

      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 10;

      let txn = await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    xit("cannot send CST to the reward pool when frozen", async function() {
    });
    xit("cannot receive CST reward when frozen", async function() {
    });
  });

});
