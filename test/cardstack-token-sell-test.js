const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");

contract('CardStackToken', function(accounts) {
  let ledger;
  let storage;
  let cst;
  let registry;

  describe("sell()", function() {

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);

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
      let totalInCirculation = await cst.totalInCirculation();

      endWalletBalance = asInt(endWalletBalance);

      assert.ok(cumulativeGasUsed < 50000, "Less than 50000 gas was used for the txn");
      assert.ok(Math.abs(startWalletBalance + (sellAmount * web3.toWei(0.1, "ether")) - (GAS_PRICE * cumulativeGasUsed) - endWalletBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet balance is correct");
      assert.equal(asInt(endCstBalance), 0, "The CST balance is correct");
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

      let exceptionThrown;
      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 100, "The CST total in circulation was not updated");
    });

    xit("should not be able to sell more CST that would cause CST eth to be below minimumEthBalance", async function() {
    });
  });
});
