const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const {
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  assertRevert,
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
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      });
      await registry.register("CST", cst.address);
      await ledger.mintTokens(100);
      await ledger.debitAccount(grantor, 50);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 100, 1000000, NULL_ADDRESS);
      await cst.setAllowTransfers(true);
    });

    it("allows account to approve an allowance for a spender", async function() {
      let txn = await cst.approve(spender, 10, { from: grantor });
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");

      let event = txn.logs[0];

      assert.equal(event.event, "Approval", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 10, "The value is correct");
      assert.equal(event.args._owner, grantor, "The grantor is correct");
      assert.equal(event.args._spender, spender, "The spendor is correct");
    });

    it("does not allow an account to approve itself as a spender", async function() {
      await assertRevert(async () => await cst.approve(grantor, 10, { from: grantor }));
      let allowance = await cst.allowance(grantor, grantor);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
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
      assert.equal(event.args._value, 10, "The CST amount is correct");
      assert.equal(event.args._from, grantor, "The sender is correct");
      assert.equal(event.args._to, recipient, "The recipient is correct");
    });

    it("does not allow a spender to transferFrom an account that they have not been approved for", async function() {
      let unauthorizedAccount = accounts[9];
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.transferFrom(unauthorizedAccount, recipient, 10, { from: spender }));

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("does not allow a spender to transferFrom an account that they have not been approved for 0 CST", async function() {
      let unauthorizedAccount = accounts[9];
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.transferFrom(unauthorizedAccount, recipient, 0, { from: spender }));

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("does not allow a spender to transferFrom more than their allowance", async function() {
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 11, { from: spender }));

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("does not allow a spender to transferFrom more than the balance in the approved account", async function() {
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 51, { from: spender }));

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });

    it("should not be able to transferFrom when allowTransfers is false", async function() {
      await cst.setAllowTransfers(false);
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 10, { from: spender }));

      let grantorBalance = await cst.balanceOf(grantor);
      let recipientBalance = await cst.balanceOf(recipient);
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });
  });
});
