const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const { proxyContract } = require('./utils');
const { assertRevert } = require("../lib/utils");

contract('CstLedger', function(accounts) {
  let ledger;
  let admin = accounts[3];
  let proxyAdmin = accounts[41];

  describe("ledger", function() {
    beforeEach(async function() {
      ledger = (await proxyContract(TestingCstLedger, proxyAdmin)).contract;
    });

    it("allows owner to add an admin", async function() {
      await ledger.addAdmin(admin);
      let isAdmin = await ledger.admins(admin);
      let adminCount = await ledger.totalAdminsMapping();
      let firstAdminAddress = await ledger.adminsForIndex(0);

      assert.ok(isAdmin, "admin was added");
      assert.equal(adminCount, 1, 'the admin count is correct');
      assert.equal(firstAdminAddress, admin, 'the admin address is correct');
    });

    it("allows owner to remove an admin", async function() {
      await ledger.addAdmin(admin);

      let isAdmin = await ledger.admins(admin);
      let adminCount = await ledger.totalAdminsMapping();
      let firstAdminAddress = await ledger.adminsForIndex(0);

      assert.ok(isAdmin, "admin was added");

      await ledger.removeAdmin(admin);
      isAdmin = await ledger.admins(admin);

      assert.notOk(isAdmin, "admin was removed");
      assert.equal(adminCount, 1, 'the admin count is correct');
      assert.equal(firstAdminAddress, admin, 'the admin address is correct');
    });

    it("non-owner cannot add admins", async function() {
      let nonOwner = accounts[7];
      await assertRevert(async () => await ledger.addAdmin(admin, { from: nonOwner }));

      let isAdmin = await ledger.admins(admin);
      let adminCount = await ledger.totalAdminsMapping();

      assert.notOk(isAdmin, "admin was not added");
      assert.equal(adminCount, 0, 'the admin count is correct');
    });

    it("allows admin to mint tokens", async function() {
      await ledger.addAdmin(admin);

      let totalTokens = await ledger.totalTokens();
      assert.equal(totalTokens, 0);

      await ledger.mintTokens(123, { from: admin });

      totalTokens = await ledger.totalTokens();
      assert.equal(totalTokens, 123);
    });

    it("allows admin to transfer tokens", async function() {
      let senderAccount = accounts[5];
      let recipientAccount = accounts[9];

      await ledger.addAdmin(admin);
      await ledger.debitAccount(senderAccount, 100);
      await ledger.debitAccount(recipientAccount, 100);

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(senderBalance, 100, "sender balance is 100");
      assert.equal(recipientBalance, 100, "recipient balance is 100");

      await ledger.transfer(senderAccount, recipientAccount, 37, { from: admin });

      senderBalance = await ledger.balanceOf(senderAccount);
      recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(senderBalance, 63, "sender balance is 63");
      assert.equal(recipientBalance, 137, "recipient balance is 137");
    });

    it("does not allow transfer of more tokens than in the sender's account", async function() {
      let senderAccount = accounts[5];
      let recipientAccount = accounts[9];

      await ledger.addAdmin(admin);
      await ledger.debitAccount(senderAccount, 100);
      await ledger.debitAccount(recipientAccount, 100);

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(senderBalance, 100, "sender balance is 100");
      assert.equal(recipientBalance, 100, "recipient balance is 100");

      await assertRevert(async () => await ledger.transfer(senderAccount, recipientAccount, 137, { from: admin }));
    });

    it("allows admin to debit accounts", async function() {
      let otherAccount = accounts[6];
      await ledger.addAdmin(admin);

      let otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 0, "account balance is 0");

      await ledger.debitAccount(otherAccount, 100, { from: admin });

      otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 100, "account balance is 100");
    });

    it("allows admin to credit accounts", async function() {
      let otherAccount = accounts[6];
      await ledger.addAdmin(admin);
      await ledger.debitAccount(otherAccount, 100, { from: admin }); // need to debit so that we can credit

      let otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 100, "account balance is 100");

      await ledger.creditAccount(otherAccount, 50, { from: admin });

      otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 50, "account balance is 50");
    });

    it("does not allow crediting more tokens than are in the account", async function() {
      let otherAccount = accounts[6];
      await ledger.addAdmin(admin);
      await ledger.debitAccount(otherAccount, 100, { from: admin }); // need to debit so that we can credit

      await assertRevert(async () => await ledger.creditAccount(otherAccount, 150, { from: admin }));

      let otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 100, "account balance is 100");
    });

    it("non-admins cannot credit accounts", async function() {
      let otherAccount = accounts[5];
      let nonAdminAccount = accounts[13];
      await ledger.addAdmin(admin);
      await ledger.debitAccount(otherAccount, 100, { from: admin });


      await assertRevert(async () => await ledger.creditAccount(otherAccount, 50, { from: nonAdminAccount }));
    });

    it("non-admins cannot debit accounts", async function() {
      let otherAccount = accounts[5];
      let nonAdminAccount = accounts[13];
      await assertRevert(async () => await ledger.debitAccount(otherAccount, 100, { from: nonAdminAccount }));
    });

    it("non-admins cannot mint tokens", async function() {
      let nonAdminAccount = accounts[17];

      await assertRevert(async () => await ledger.mintTokens(234, { from: nonAdminAccount }));
    });

    it("non-admins cannot transfer tokens", async function() {
      let senderAccount = accounts[5];
      let recipientAccount = accounts[9];
      let nonAdminAccount = accounts[13];

      await ledger.debitAccount(senderAccount, 100);
      await ledger.debitAccount(recipientAccount, 100);

      await assertRevert(async () => await ledger.transfer(senderAccount, recipientAccount, 37, { from: nonAdminAccount }));
    });
  });
});
