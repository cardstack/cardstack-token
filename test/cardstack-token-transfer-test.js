const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const {
  GAS_PRICE,
  NULL_ADDRESS,
  asInt,
  checkBalance
} = require("../lib/utils");

contract('CardStackToken', function(accounts) {

  describe("transfer()", function() {
    let cst;
    let ledger;
    let storage;
    let registry;
    let senderAccount = accounts[3];
    let recipientAccount = accounts[4];

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address);
      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 100, 100, 1000000, NULL_ADDRESS);

      await cst.setAllowTransfers(true);
      await checkBalance(senderAccount, 1);
      await cst.addBuyer(senderAccount);
      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.configure(0x0, 0x0, 0, 0, 0, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("should be able to transfer CST to another account", async function() {
      let transferAmount = 10;

      let txn = await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value.toString(), "10", "The CST amount is correct");
      assert.equal(event.args._from, senderAccount, "The sender is correct");
      assert.equal(event.args._to, recipientAccount, "The recipient is correct");
    });

    it("should not be able to transfer more CST than is in the sender's account", async function() {
      let transferAmount = 11;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("should not be able to transfer when allowTransfers is false", async function() {
      await cst.setAllowTransfers(false);
      let transferAmount = 10;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

  });
});
