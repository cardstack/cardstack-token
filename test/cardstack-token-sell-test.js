const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  asInt,
  assertRevert,
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

  xdescribe("sell()", function() {

    /*
     * Chris wants to disable sell() until after phase 2
     * and then replace with a foundation approval mechanism
     * to approve a sell of CST back to the smart contrac to
     * prevent arbitrage
     */

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      });
      await registry.register("CST", cst.address);
      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, 1000000, NULL_ADDRESS);

      for (let i = 0; i < Math.min(accounts.length, 10); i++) {
        let account = accounts[i];

        await checkBalance(account, 1);
      }
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.configure(0x0, 0x0, 0, 0, 0, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("should be able to sell CST", async function() {
      let sellerAccount = accounts[2];
      await cst.buy({
        from: sellerAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

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

      assert.ok(cumulativeGasUsed < 60000, "Less than 60000 gas was used for the txn");
      assert.ok(Math.abs(startWalletBalance + (sellAmount * web3.toWei(0.1, "ether")) - (GAS_PRICE * cumulativeGasUsed) - endWalletBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet balance is correct");
      assert.equal(asInt(endCstBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was updated correctly");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value, 10, "The CST amount is correct");
      assert.equal(event.args._from, sellerAccount, "The sender is correct");
      assert.equal(event.args._to, cst.address, "The recipient is correct");
    });

    it("should not be able to sell more CST than in sellers account", async function() {
      let sellerAccount = accounts[2];
      await cst.buy({
        from: sellerAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 11;
      startBalance = asInt(startBalance);

      await assertRevert(async () => await cst.sell(sellAmount, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("should not be able to sell more CST that would cause CST eth to be below minimumBalance", async function() {
      let sellerAccount = accounts[2];
      await cst.buy({
        from: sellerAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 6;
      let minimumBalance = web3.toWei(0.5, "ether");
      let cstEth = await web3.eth.getBalance(cst.address);
      startBalance = asInt(startBalance);

      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber() - minimumBalance);

      await cst.setMinimumBalance(web3.toWei(0.5, "ether"));

      await assertRevert(async () => await cst.sell(sellAmount, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      }));

      cstEth = await web3.eth.getBalance(cst.address);

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
      assert.equal(cstEth.toNumber(), minimumBalance, "The CST ether balance is correct");
    });
  });
});
