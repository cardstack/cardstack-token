const {
  checkBalance,
  asInt,
  NULL_ADDRESS,
  MAX_FAILED_TXN_GAS,
  GAS_PRICE
} = require("../lib/utils");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('CardStackToken', function(accounts) {
  describe("contract upgrade", function() {
    let cst1;
    let cst2;
    let ledger;
    let storage;
    let admin = accounts[2];

    beforeEach(async function() {
      storage = await Storage.new();
      ledger = await CstLedger.new();
      cst1 = await CardStackToken.new(ledger.address, storage.address);
      cst2 = await CardStackToken.new(ledger.address, storage.address);

      await storage.addAdmin(cst1.address);
      await ledger.addAdmin(cst1.address);
      await storage.addAdmin(cst2.address);
      await ledger.addAdmin(cst2.address);
      await ledger.mintTokens(100);
      await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      await cst2.initializeFromStorage();
      await cst1.addAdmin(admin);
      await cst2.addAdmin(admin);
    });

    it("can indiciate if the contract is deprecated", async function() {
      let isDeprecatedCst1 = await cst1.isDeprecated();
      let isDeprecatedCst2 = await cst2.isDeprecated();
      let cst1Successor = await cst1.successor();
      let cst2Successor = await cst2.successor();
      let cst1Predecessor = await cst1.predecessor();
      let cst2Predecessor = await cst2.predecessor();

      assert.notOk(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst1Successor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');

      let upgradeToTxn = await cst1.upgradeTo(cst2.address);
      let upgradedFromTxn = await cst2.upgradedFrom(cst1.address);

      isDeprecatedCst1 = await cst1.isDeprecated();
      isDeprecatedCst2 = await cst2.isDeprecated();
      cst1Successor = await cst1.successor();
      cst2Successor = await cst2.successor();
      cst1Predecessor = await cst1.predecessor();
      cst2Predecessor = await cst2.predecessor();

      assert.ok(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Predecessor, cst1.address, 'the contract address is correct');
      assert.equal(cst1Successor, cst2.address, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');

      assert.equal(upgradeToTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradedFromTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradeToTxn.logs[0].event, "Upgraded", "the event type is correct");
      assert.equal(upgradeToTxn.logs[0].args.successor, cst2.address);
      assert.equal(upgradedFromTxn.logs[0].event, "UpgradedFrom", "the event type is correct");
      assert.equal(upgradedFromTxn.logs[0].args.predecessor, cst1.address);
    });

    it("does not allow a non-owner to add an admin", async function() {
      let nonOwner = accounts[9];
      let exceptionThrown;

      try {
        await cst1.addAdmin(nonOwner, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      let isAdmin = await cst1.admins(nonOwner);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.notOk(isAdmin, "The admin was not set");
    });

    it("does not allow a non-owner to remove an admin", async function() {
      let nonOwner = accounts[9];
      let exceptionThrown;

      try {
        await cst1.removeAdmin(admin, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      let isAdmin = await cst1.admins(admin);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.ok(isAdmin, "The admin was not set");
    });

    it("does not allow a non-admin to invoke upgradeTo", async function() {
      let nonAdmin = accounts[8];
      let exceptionThrown;

      try {
        await cst1.upgradeTo(cst2.address, { from: nonAdmin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown");

      let isDeprecatedCst1 = await cst1.isDeprecated();
      let cst1Successor = await cst1.successor();
      let cst1Predecessor = await cst1.predecessor();

      assert.notOk(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst1Successor, NULL_ADDRESS, 'the contract address is correct');
    });

    it("does not allow a non-admin to invoke upgradeFrom", async function() {
      let nonAdmin = accounts[8];
      let exceptionThrown;

      try {
        await cst2.upgradeTo(cst1.address, { from: nonAdmin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown");

      let isDeprecatedCst2 = await cst2.isDeprecated();
      let cst2Successor = await cst2.successor();
      let cst2Predecessor = await cst2.predecessor();

      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');
    });

    it("does not allow purchase of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let buyerAccount = accounts[4];
      checkBalance(buyerAccount, 1);
      let txnValue = web3.toWei(0.1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst1.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await ledger.balanceOf(buyerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("does not allow selling of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let sellerAccount = accounts[2];
      await ledger.debitAccount(sellerAccount, 10);
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 10;
      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst1.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await ledger.balanceOf(sellerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("does not allow transfer of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let transferAmount = 10;
      let senderAccount = accounts[8];
      let recipientAccount = accounts[9];
      await ledger.debitAccount(senderAccount, 10);

      let exceptionThrown;
      try {
        await cst1.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("does not allow minting of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let exceptionThrown;
      try {
        await cst1.mintTokens(1000);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });

    it("does not allow token grant of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let recipientAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst1.grantTokens(recipientAccount, 10);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();
      let recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });

    it("does not allow set buy and set prices when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"));
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let buyPrice = await storage.getUIntValue(web3.sha3("cstBuyPrice"));
      let sellPrice = await storage.getUIntValue(web3.sha3("cstSellPrice"));

      assert.equal(asInt(sellPrice), web3.toWei(0.1, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, "ether"), "The buyPrice is correct");
    });

    it("does not allow set sell cap when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.setsellcap(20);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellCap = await storage.getUIntValue(web3.sha3("cstSellCap"));

      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
    });

    it("does not allow cstAvailableToBuy when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.cstAvailableToBuy();
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");
    });

    it("does not allow updatedLedgerStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let newLedger = await CstLedger.new();
      let exceptionThrown;
      try {
        await cst1.updateLedgerStorage(newLedger.address);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow updatedExternalStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let newStorage = await Storage.new();
      let exceptionThrown;
      try {
        await cst1.updateExternalStorage(newStorage.address);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow initialize when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow initializeFromStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.initializeFromStorage();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow name() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.name();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow symbol() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.symbol();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow totalInCirculation() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.totalInCirculation();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow totalTokens() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.totalTokens();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow balanceOf() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.balanceOf(accounts[5]);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });
  });
});
