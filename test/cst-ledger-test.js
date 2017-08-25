const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('CstLedger', function(accounts) {
  let ledger;
  let cst;
  let storage;
  let owner = accounts[0];
  let admin = accounts[3];

  describe("ledger", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      cst = await CardStackToken.new(ledger.address, storage.address);
    });

    it("allows owner to add an admin", async function() {
      await ledger.addAdmin(admin);
      let isAdmin = await ledger.admins(admin);

      assert.ok(isAdmin, "admin was added");
    });

    it("allows owner to remove an admin", async function() {
      await ledger.addAdmin(admin);

      let isAdmin = await ledger.admins(admin);

      assert.ok(isAdmin, "admin was added");

      await ledger.removeAdmin(admin);
      isAdmin = await ledger.admins(admin);

      assert.notOk(isAdmin, "admin was removed");
    });

    it("non-owner cannot add admins", async function() {
      let nonOwner = accounts[7];
      let exceptionThrown;

      try {
        await ledger.addAdmin(admin, { from: nonOwner });
      } catch(err) {
        exceptionThrown = true;
      }

      isAdmin = await ledger.admins(admin);

      assert.ok(exceptionThrown, "Exception was thrown");
      assert.notOk(isAdmin, "admin was not added");
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
      let exceptionThrown;

      await ledger.addAdmin(admin);
      await ledger.debitAccount(senderAccount, 100);
      await ledger.debitAccount(recipientAccount, 100);

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(senderBalance, 100, "sender balance is 100");
      assert.equal(recipientBalance, 100, "recipient balance is 100");

      try {
        await ledger.transfer(senderAccount, recipientAccount, 137, { from: admin });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to transfer more tokens than in sender's account");
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
      let exceptionThrown;
      await ledger.addAdmin(admin);
      await ledger.debitAccount(otherAccount, 100, { from: admin }); // need to debit so that we can credit

      try {
        await ledger.creditAccount(otherAccount, 150, { from: admin });
      } catch(e) {
        exceptionThrown = true
      }

      otherBalance = await ledger.balanceOf(otherAccount);
      assert.equal(otherBalance, 100, "account balance is 100");
      assert.ok(exceptionThrown, "exception was thrown trying to credit more than was in account");
    });

    it("non-admins cannot credit accounts", async function() {
      let otherAccount = accounts[5];
      let nonAdminAccount = accounts[13];
      let exceptionThrown;
      await ledger.addAdmin(admin);
      await ledger.debitAccount(otherAccount, 100, { from: admin });


      try {
        await ledger.creditAccount(otherAccount, 50, { from: nonAdminAccount });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to credit account as non-admin");
    });

    it("non-admins cannot debit accounts", async function() {
      let otherAccount = accounts[5];
      let nonAdminAccount = accounts[13];
      let exceptionThrown;

      try {
        await ledger.debitAccount(otherAccount, 100, { from: nonAdminAccount });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to debit account as non-admin");
    });

    it("non-admins cannot mint tokens", async function() {
      let nonAdminAccount = accounts[17];
      let exceptionThrown;

      try {
        await ledger.mintTokens(234, { from: nonAdminAccount });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to mint tokens as non-admin");
    });

    it("non-admins cannot transfer tokens", async function() {
      let senderAccount = accounts[5];
      let recipientAccount = accounts[9];
      let nonAdminAccount = accounts[13];
      let exceptionThrown;

      await ledger.debitAccount(senderAccount, 100);
      await ledger.debitAccount(recipientAccount, 100);

      try {
        await ledger.transfer(senderAccount, recipientAccount, 37, { from: nonAdminAccount });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to transfer as non-admin");
    });
  });
});
