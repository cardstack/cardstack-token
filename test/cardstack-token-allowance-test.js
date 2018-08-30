const TestingCardstackToken = artifacts.require("./TestingCardstackToken.sol");
const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const TestingRegistry = artifacts.require("./TestingRegistry.sol");
const { proxyContract } = require('./utils');
const {
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
  asInt
} = require("../lib/utils");

contract('CardstackToken', function(accounts) {
  let proxyAdmin = accounts[41];

  describe("allowance", function() {
    let cst;
    let ledger;
    let storage;
    let registry;
    let grantor = accounts[3];
    let spender = accounts[4];
    let recipient = accounts[7];

    beforeEach(async function() {
      ledger = (await proxyContract(TestingCstLedger, proxyAdmin)).contract;
      storage = await Storage.new();
      registry = (await proxyContract(TestingRegistry, proxyAdmin)).contract;
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = (await proxyContract(TestingCardstackToken, proxyAdmin, registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      })).contract;
      await registry.register("CST", cst.address, CARDSTACK_NAMEHASH);
      await cst.freezeToken(false);
      await ledger.mintTokens(100);
      await ledger.debitAccount(grantor, 50);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 100, 1000000, NULL_ADDRESS);
    });

    it("allows account to increase the allowance for a spender", async function() {
      await cst.approve(spender, 10, { from: grantor });
      let txn = await cst.increaseApproval(spender, 2, { from: grantor });
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 12, "the allowance is correct");

      let event = txn.logs[0];

      assert.equal(event.event, "Approval", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 12, "The value is correct");
      assert.equal(event.args._owner, grantor, "The grantor is correct");
      assert.equal(event.args._spender, spender, "The spendor is correct");
    });

    it("does not allow an account to designate itself as a spender when increasing amount", async function() {
      await assertRevert(async () => await cst.increaseApproval(grantor, 10, { from: grantor }));
      let allowance = await cst.allowance(grantor, grantor);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
    });

    it("allows account to decrease the allowance for a spender", async function() {
      await cst.approve(spender, 10, { from: grantor });
      let txn = await cst.decreaseApproval(spender, 2, { from: grantor });
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 8, "the allowance is correct");

      let event = txn.logs[0];

      assert.equal(event.event, "Approval", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 8, "The value is correct");
      assert.equal(event.args._owner, grantor, "The grantor is correct");
      assert.equal(event.args._spender, spender, "The spendor is correct");
    });

    it("does not allow an account to designate itself as a spender when decreasing amount", async function() {
      await assertRevert(async () => await cst.decreaseApproval(grantor, 10, { from: grantor }));
      let allowance = await cst.allowance(grantor, grantor);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
    });

    it("asserts that the minimum allowance is not negative when decreasing the allowance", async function() {
      await cst.approve(spender, 2, { from: grantor });
      let txn = await cst.decreaseApproval(spender, 3, { from: grantor });
      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 0, "the allowance is correct");

      let event = txn.logs[0];

      assert.equal(event.event, "Approval", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 0, "The value is correct");
      assert.equal(event.args._owner, grantor, "The grantor is correct");
      assert.equal(event.args._spender, spender, "The spendor is correct");
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

    it("does not allow an account to approve a non-0 allowance for a spender, when the current allowance for the spender is greater  than 0", async function() {
      await cst.approve(spender, 10, { from: grantor });
      await assertRevert(async () => await cst.approve(spender, 20, { from: grantor }));

      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
    });

    it("does allow an account to set an allowance to 0 for a spender", async function() {
      await cst.approve(spender, 10, { from: grantor });
      await cst.approve(spender, 0, { from: grantor });

      let allowance = await cst.allowance(grantor, spender);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
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

    it("does allow a spender to transferFrom an account for 0 CST", async function() {
      let account = accounts[9];
      await cst.approve(spender, 10, { from: grantor });
      await cst.transferFrom(account, recipient, 0, { from: spender });

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

  });
});
