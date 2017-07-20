const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(accounts) {

  describe("sell()", function() {
    let cst;

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      for (let i = 0; i < Math.min(accounts.length, 10); i++) {
        let account = accounts[i];

        await checkBalance(account, 1);

        await cst.buy({
          from: account,
          value: web3.toWei(1, "ether"),
          gasPrice: GAS_PRICE
        });
      }
    });

    it("should be able to sell CST", async function() {
      let sellerAccount = accounts[2];
      let startWalletBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 10;
      startWalletBalance = asInt(startWalletBalance);

      let txn = await cst.sell(sellAmount, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endWalletBalance = await web3.eth.getBalance(sellerAccount);
      let endCstBalance = await cst.balanceOf(sellerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endWalletBalance = asInt(endWalletBalance);

      assert.ok(cumulativeGasUsed < 50000, "Less than 50000 gas was used for the txn");
      assert.ok(Math.abs(startWalletBalance + (sellAmount * web3.toWei(0.1, "ether")) - (GAS_PRICE * cumulativeGasUsed) - endWalletBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet credited correctly");
      assert.equal(asInt(endCstBalance), 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was updated correctly");
      assert.equal(asInt(totalInCirculation), 90, "The CST total in circulation was updated correctly");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Sell", "The event type is correct");
      assert.equal(event.args.sellPrice.toString(), (sellAmount * web3.toWei(0.1, "ether")), "The sell price is correct");
      assert.equal(event.args.value.toString(), "10", "The CST amount is correct");
      assert.equal(event.args.seller, sellerAccount, "The CST seller is correct");
      assert.equal(event.args.sellerAccount, sellerAccount, "The CST seller account is correct");
    });

    it("should not be able to sell more CST than in sellers account", async function() {
      let sellerAccount = accounts[2];
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 11;
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

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(supply), 0, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 100, "The CST total in circulation was not updated");
    });
  });
});
