const {
  GAS_PRICE,
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

  describe("frozen account", function() {
    let frozenAccount = accounts[5];
    let freezeEvent;

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
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(1, "ether"), 100, 100, 1000000, NULL_ADDRESS);

      await checkBalance(frozenAccount, 1);
      await cst.addBuyer(frozenAccount);
      await cst.setAllowTransfers(true);
      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });


      let frozenCount = await cst.totalFrozenAccountsMapping();
      let firstFrozenAccount = await cst.frozenAccountForIndex(0);
      let isFrozen = await cst.frozenAccount(frozenAccount);

      assert.notOk(isFrozen, "the account is not frozen");
      assert.equal(frozenCount, 0, "the frozenCount is correct");
      assert.equal(firstFrozenAccount, NULL_ADDRESS, "the frozenAccountForIndex is correct");

      freezeEvent = await cst.freezeAccount(frozenAccount, true);
    });

    /* removing sell until after phase 2 */
    xit("cannot sell CST when frozen", async function() {
      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
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

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");

      assert.equal(freezeEvent.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(freezeEvent.logs[0].args.target, frozenAccount, 'the target value is correct');
      assert.equal(freezeEvent.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("cannot buy CST when frozen", async function() {
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

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
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
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

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.addBuyer(senderAccount);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("can unfreeze an account", async function() {
      let frozenCount = await cst.totalFrozenAccountsMapping();
      let firstFrozenAccount = await cst.frozenAccountForIndex(0);
      let isFrozen = await cst.frozenAccount(frozenAccount);

      assert.ok(isFrozen, "the account is frozen");
      assert.equal(frozenCount, 1, "the frozenCount is correct");
      assert.equal(firstFrozenAccount, frozenAccount, "the frozenAccountForIndex is correct");

      let unfreezeEvent = await cst.freezeAccount(frozenAccount, false);

      frozenCount = await cst.totalFrozenAccountsMapping();
      firstFrozenAccount = await cst.frozenAccountForIndex(0);
      isFrozen = await cst.frozenAccount(frozenAccount);

      assert.notOk(isFrozen, "the account is not frozen");
      assert.equal(frozenCount, 1, "the frozenCount is correct");
      assert.equal(firstFrozenAccount, frozenAccount, "the frozenAccountForIndex is correct");

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
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");

      assert.equal(unfreezeEvent.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(unfreezeEvent.logs[0].args.target, frozenAccount, 'the target value is correct');
      assert.equal(unfreezeEvent.logs[0].args.frozen, false, 'the frozen value is correct');
    });

    it("does not allow approving allowance when spender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(spender, true);

      let exceptionThrown;
      try {
        await cst.approve(spender, 10, { from: grantor });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow approving allowance when grantor account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(grantor, true);

      let exceptionThrown;
      try {
        await cst.approve(spender, 10, { from: grantor });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow transferFrom when sender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(spender, true);

      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 10, { from: spender });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow transferFrom when 'from' account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(grantor, true);

      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 10, { from: spender });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow transferFrom when 'to' account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(recipient, true);

      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 10, { from: spender });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });
  });

  describe("frozen token", function() {
    let frozenAccount = accounts[5];
    let freezeEvent;

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
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, 100, 1000000, NULL_ADDRESS);

      await cst.setAllowTransfers(true);
      await checkBalance(frozenAccount, 1);

      await cst.addBuyer(frozenAccount);
      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    it("should not be able to mint tokens when token is frozen", async function() {
      freezeEvent = await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.mintTokens(100);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
    });

    it("should not be able to grant tokens when token is frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let exceptionThrown;
      try {
        await cst.grantTokens(frozenAccount, 10);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();
      let recipientBalance = await ledger.balanceOf(frozenAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 10, "The balance is correct");
    });

    /* removing sell() until after phase 2 */
    xit("cannot sell CST when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);

      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
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
      let cstBalance = await ledger.balanceOf(sellerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");

      assert.equal(freezeEvent.logs[0].event, 'FrozenToken', 'the account freeze event is correct');
      assert.equal(freezeEvent.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("cannot buy CST when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

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
      let cstBalance = await ledger.balanceOf(buyerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
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

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.addBuyer(senderAccount);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      freezeEvent = await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
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
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("should be able to unfreeze entire token", async function() {
      freezeEvent = await cst.freezeToken(true);
      let unfreezeEvent = await cst.freezeToken(false);
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.addBuyer(senderAccount);
      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      });

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 9, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 11, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");

      assert.equal(unfreezeEvent.logs[0].event, 'FrozenToken', 'the account freeze event is correct');
      assert.equal(unfreezeEvent.logs[0].args.frozen, false, 'the frozen value is correct');
    });

    it("does not allow approving allowance when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.approve(spender, 10, { from: grantor });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow transferFrom when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 10, { from: spender });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("cannot invoke balanceOf when token frozen", async function() {
      let grantor = accounts[3];

      await ledger.debitAccount(grantor, 50);

      let grantorBalance = await cst.balanceOf(grantor);

      assert.equal(asInt(grantorBalance), 50, "the balance is correct");

      await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.balanceOf(grantor);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("cannot invoke totalInCirculation when token frozen", async function() {
      await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.totalInCirculation();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("cannot invoke totalSupply when token frozen", async function() {
      await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.totalSupply();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });
  });
});
