const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const {
  NULL_ADDRESS,
  asInt
} = require("../lib/utils");

contract('CardStackToken', function(accounts) {

  describe("allowance", function() {
    let cst;
    let ledger;
    let storage;
    let registry;
    let grantor = accounts[3];
    let spender = accounts[4];
    let recipient = accounts[7];

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
      await ledger.debitAccount(grantor, 50);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
    });

    it("allows account to approve an allowance for a spender", async function() {
      let txn = await cst.approve(spender, 10, { from: grantor });
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");

      let event = txn.logs[0];

      assert.equal(event.event, "Approval", "The event type is correct");
      assert.equal(event.args.value.toNumber(), 10, "The value is correct");
      assert.equal(event.args.grantor, grantor, "The grantor is correct");
      assert.equal(event.args.grantorAccount, grantor, "The grantorAccount is correct");
      assert.equal(event.args.spender, spender, "The spendor is correct");
      assert.equal(event.args.spenderAccount, spender, "The spenderAccount is correct");
    });

    it("allows spender to transferFrom their approved account, and allowance is updated correctly", async function() {
      await cst.approve(spender, 10, { from: grantor });

      let txn = await cst.transferFrom(grantor, recipient, 10, { from: spender });

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 40, "the balance is correct");
      assert.equal(asInt(recipientBalance), 10, "the balance is correct");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args.value, 10, "The CST amount is correct");
      assert.equal(event.args.sender, grantor, "The sender is correct");
      assert.equal(event.args.senderAccount, grantor, "The senderAccount is correct");
      assert.equal(event.args.recipient, recipient, "The recipient is correct");
      assert.equal(event.args.recipientAccount, recipient, "The recipientAccount is correct");
    });

    it("does not allow a spender to transferFrom an account that they have not been approved for", async function() {
      let unauthorizedAccount = accounts[9];
      await cst.approve(spender, 10, { from: grantor });
      let exceptionThrown;
      try {
        await cst.transferFrom(unauthorizedAccount, recipient, 10, { from: spender });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("does not allow a spender to transferFrom more than their allowance", async function() {
      await cst.approve(spender, 10, { from: grantor });
      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 11, { from: spender });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("does not allow a spender to transferFrom more than the balance in the approved account", async function() {
      await cst.approve(spender, 10, { from: grantor });
      let exceptionThrown;
      try {
        await cst.transferFrom(grantor, recipient, 51, { from: spender });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });
  });
});
