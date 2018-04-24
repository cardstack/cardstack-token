const {
  NULL_ADDRESS,
  assertRevert
} = require("../lib/utils");
const ExternalStorage = artifacts.require("./ExternalStorage.sol");

contract('ExternalStorage', function(accounts) {
  let storage;
  let admin = accounts[3];

  describe("external storage", function() {
    beforeEach(async function() {
      storage = await ExternalStorage.new();
    });

    it("allows owner to add an admin", async function() {
      await storage.addAdmin(admin);
      let isAdmin = await storage.admins(admin);
      let adminCount = await storage.totalAdminsMapping();
      let firstAdminAddress = await storage.adminsForIndex(0);

      assert.ok(isAdmin, "admin was added");
      assert.equal(adminCount, 1, 'the admin count is correct');
      assert.equal(firstAdminAddress, admin, 'the admin address is correct');
    });

    it("allows owner to remove an admin", async function() {
      await storage.addAdmin(admin);
      let isAdmin = await storage.admins(admin);
      let adminCount = await storage.totalAdminsMapping();
      let firstAdminAddress = await storage.adminsForIndex(0);

      assert.ok(isAdmin, "admin was added");

      await storage.removeAdmin(admin);
      isAdmin = await storage.admins(admin);

      assert.notOk(isAdmin, "admin was removed");
      assert.equal(adminCount, 1, 'the admin count is correct');
      assert.equal(firstAdminAddress, admin, 'the admin address is correct');
    });

    it("non-owner cannot add admins", async function() {
      let nonOwner = accounts[7];

      await assertRevert(async () => await storage.addAdmin(admin, { from: nonOwner }));

      let isAdmin = await storage.admins(admin);
      let adminCount = await storage.totalAdminsMapping();

      assert.notOk(isAdmin, "admin was not added");
      assert.equal(adminCount, 0, 'the admin count is correct');
    });

    it("allows admin to set uint value", async function () {
      await storage.addAdmin(admin);
      await storage.setUIntValue("cstBuyPrice", 11, { from: admin });

      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice");
      assert.equal(storageBuyPrice, 11, "uint value was set by admin");
    });

    it("does not allow non-admin to set uint value", async function() {
      let nonAdmin = accounts[17];

      await assertRevert(async () => await storage.setUIntValue("cstBuyPrice", 11, { from: nonAdmin }));
      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice");
      assert.equal(storageBuyPrice.toNumber(), 0, "uint value was not set");
    });

    it("gets uint value", async function () {
      let someUser = accounts[13];

      await storage.addAdmin(admin);
      await storage.setUIntValue("cstBuyPrice", 11, { from: admin });

      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice", { from: someUser });
      assert.equal(storageBuyPrice, 11, "unit value was getted by non-admin");
    });

    it("allows admin to set bytes32 value", async function () {
      await storage.addAdmin(admin);
      await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"), { from: admin });

      let storageTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      assert.equal(web3.toUtf8(storageTokenSymbol.toString()), "CST", "bytes32 value was set by admin");
    });

    it("does not allow non-admin to set bytes32 value", async function() {
      let nonAdmin = accounts[17];

      await assertRevert(async () => await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"), { from: nonAdmin }));
      let storageTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      assert.equal(web3.toUtf8(storageTokenSymbol.toString()), "", "bytes32 value was not set");
    });

    it("gets bytes32 value", async function () {
      let someUser = accounts[13];

      await storage.addAdmin(admin);
      await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"), { from: admin });

      let storageTokenSymbol = await storage.getBytes32Value("cstTokenSymbol", { from: someUser });
      assert.equal(web3.toUtf8(storageTokenSymbol.toString()), "CST", "bytes32 value was getted by non-admin");
    });

    it("allows admin to set address value", async function () {
      let rewardPool = accounts[8];

      await storage.addAdmin(admin);
      await storage.setAddressValue("cstRewardPool", rewardPool, { from: admin });

      let storageRewardPool = await storage.getAddressValue("cstRewardPool");
      assert.equal(storageRewardPool, rewardPool, "address value was set by admin");
    });

    it("does not allow non-admin to set address value", async function() {
      let rewardPool = accounts[8];
      let someUser = accounts[13];

      await assertRevert(async () => await storage.setAddressValue("cstRewardPool", rewardPool, { from: someUser }));
      let storageRewardPool = await storage.getAddressValue("cstRewardPool");
      assert.equal(storageRewardPool.toString(), NULL_ADDRESS, "address value was not set by non-admin");
    });

    it("gets address value", async function () {
      let rewardPool = accounts[8];
      let someUser = accounts[13];

      await storage.addAdmin(admin);
      await storage.setAddressValue("cstRewardPool", rewardPool, { from: admin });

      let storageRewardPool = await storage.getAddressValue("cstRewardPool", { from: someUser });
      assert.equal(storageRewardPool, rewardPool, "address value was getted by non-admin");
    });

    it("allows admin to set bytes value", async function () {
      await storage.addAdmin(admin);
      await storage.setBytesValue("somebytes", "lmnop", { from: admin });

      let storageSomebytes = await storage.getBytesValue("somebytes");
      assert.equal(web3.toUtf8(storageSomebytes.toString()), "lmnop", "bytes value was set by admin");
    });

    it("does not allow non-admin to set bytes value", async function() {
      let someUser = accounts[11];

      await assertRevert(async () => await storage.setBytesValue("somebytes", "lmnop", { from: someUser }));
      let storageSomebytes = await storage.getBytesValue("somebytes");
      assert.equal(web3.toUtf8(storageSomebytes.toString()), "", "bytes value was not set by non-admin");
    });

    it("gets bytes value", async function () {
      let someUser = accounts[11];

      await storage.addAdmin(admin);
      await storage.setBytesValue("somebytes", "lmnop", { from: admin });

      let storageSomebytes = await storage.getBytesValue("somebytes", { from: someUser });
      assert.equal(web3.toUtf8(storageSomebytes.toString()), "lmnop", "bytes value was getted by non-admin");
    });

    it("allows admin to set boolean value", async function () {
      await storage.addAdmin(admin);
      await storage.setBooleanValue("somebool", true, { from: admin });

      let storageSomebool = await storage.getBooleanValue("somebool");
      assert.equal(storageSomebool, true, "boolean value was set by admin");
    });

    it("does not allow non-admin to set boolean value", async function() {
      let someUser = accounts[11];

      await assertRevert(async () => await storage.setBooleanValue("somebool", true, { from: someUser }));
      let storageSomebool = await storage.getBooleanValue("somebool");
      assert.notOk(storageSomebool, "boolean value was not set by non-admin");
    });

    it("gets boolean value", async function () {
      let someUser = accounts[11];

      await storage.addAdmin(admin);
      await storage.setBooleanValue("somebool", true, { from: admin });

      let storageSomebool = await storage.getBooleanValue("somebool", { from: someUser });
      assert.equal(storageSomebool, true, "boolean value was getted by non-admin");
    });

    it("allows admin to set int value", async function () {
      await storage.addAdmin(admin);
      await storage.setIntValue("someint", 37, { from: admin });

      let storageSomeint = await storage.getIntValue("someint");
      assert.equal(storageSomeint, 37, "int value was set by admin");
    });

    it("does not allow non-admin to set int value", async function() {
      let someUser = accounts[11];

      await assertRevert(async () => await storage.setIntValue("someint", 37, { from: someUser }));

      let storageSomeint = await storage.getIntValue("someint");
      assert.equal(storageSomeint, 0, "int value was not set by non-admin");
    });

    it("gets int value", async function () {
      let someUser = accounts[11];

      await storage.addAdmin(admin);
      await storage.setIntValue("someint", 37, { from: admin });

      let storageSomeint = await storage.getIntValue("someint", { from: someUser });
      assert.equal(storageSomeint, 37, "int value was getted by non-admin");
    });

    it("allows admin to set ledger value", async function () {
      let someUser = [12];

      await storage.addAdmin(admin);
      await storage.setLedgerValue("someledger", someUser, 37, { from: admin });

      let storageSomevalue = await storage.getLedgerValue("someledger", someUser);
      assert.equal(storageSomevalue, 37, "ledger value was set by admin");
    });

    it("allows admin to set ledger value", async function () {
      let someUser = [12];

      await storage.addAdmin(admin);
      await storage.setLedgerValue("someledger", someUser, 37, { from: admin });

      let storageSomevalue = await storage.getLedgerValue("someledger", someUser);
      assert.equal(storageSomevalue, 37, "ledger value was set by admin");
    });

    it("does not allow non-admin to set ledger value", async function() {
      let someUser = accounts[12];
      let nonAdmin = accounts[14];

      await assertRevert(async () => await storage.setLedgerValue("someledger", someUser, 37, { from: nonAdmin }));
      let storageSomevalue = await storage.getLedgerValue("someledger", someUser);
      assert.equal(storageSomevalue, 0, "ledger value was not set by non-admin");
    });

    it("gets ledger value", async function () {
      let someUser = accounts[12];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setLedgerValue("someledger", someUser, 37, { from: admin });

      let storageSomevalue = await storage.getLedgerValue("someledger", someUser, { from: nonAdmin });
      assert.equal(storageSomevalue, 37, "ledger value was getted by non-admin");
    });

    it("gets ledger count", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setLedgerValue("someledger", someUser, 37, { from: admin });
      await storage.setLedgerValue("someledger", otherUser, 73, { from: admin });

      let ledgerCount = await storage.getLedgerCount("someledger", { from: nonAdmin });
      assert.equal(ledgerCount, 2, "ledger count was getted");
    });

    it("gets ledger address by index", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setLedgerValue("someledger", someUser, 37, { from: admin });
      await storage.setLedgerValue("someledger", otherUser, 73, { from: admin });

      let ledgerEntry = await storage.ledgerEntryForIndex(web3.sha3("someledger"), 0, { from: nonAdmin });
      assert.equal(ledgerEntry, someUser, "ledger entry was getted by index");
    });

    it("allows admin to set boolean ledger value", async function () {
      let someUser = [12];

      await storage.addAdmin(admin);
      await storage.setBooleanMapValue("someledger", someUser, true, { from: admin });

      let storageSomevalue = await storage.getBooleanMapValue("someledger", someUser);
      assert.equal(storageSomevalue, true, "value was set by admin");
    });

    it("does not allow non-admin to set boolean map value", async function() {
      let someUser = accounts[12];
      let nonAdmin = accounts[14];

      await assertRevert(async () => await storage.setBooleanMapValue("someledger", someUser, true, { from: nonAdmin }));
      let storageSomevalue = await storage.getBooleanMapValue("someledger", someUser);
      assert.equal(storageSomevalue, false, "boolean value was not set by non-admin");
    });

    it("gets boolean map value", async function () {
      let someUser = accounts[12];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setBooleanMapValue("someledger", someUser, true, { from: admin });

      let storageSomevalue = await storage.getBooleanMapValue("someledger", someUser, { from: nonAdmin });
      assert.equal(storageSomevalue, true, "boolean value was getted by non-admin");
    });

    it("gets boolean map count", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setBooleanMapValue("someledger", someUser, true, { from: admin });
      await storage.setBooleanMapValue("someledger", otherUser, false, { from: admin });

      let ledgerCount = await storage.getBooleanMapCount("someledger", { from: nonAdmin });
      assert.equal(ledgerCount, 2, "count was getted");
    });

    it("gets boolean map address by index", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setBooleanMapValue("someledger", someUser, true, { from: admin });
      await storage.setBooleanMapValue("someledger", otherUser, false, { from: admin });

      let ledgerEntry = await storage.booleanMapEntryForIndex(web3.sha3("someledger"), 0, { from: nonAdmin });
      assert.equal(ledgerEntry, someUser, "entry was retrieved by index");
    });

    it("allows admin to set multi-ledger value", async function () {
      let someUser = accounts[12];
      let otherUser = accounts[13];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("allowance", someUser, otherUser, 10, { from: admin });

      let storageSomevalue = await storage.getMultiLedgerValue("allowance", someUser, otherUser);
      assert.equal(storageSomevalue, 10, "multi-ledger value was set by admin");
    });

    it("does not allow non-admin to set multi-ledger value", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[19];

      let storageSomevalue = await storage.getMultiLedgerValue("allowance", someUser, otherUser);
      assert.equal(storageSomevalue, 0, "multi-ledger value is 0");

      await assertRevert(async () => await storage.setMultiLedgerValue("allowance", someUser, otherUser, 10, { from: nonAdmin }));
      storageSomevalue = await storage.getMultiLedgerValue("allowance", someUser, otherUser);
      assert.equal(storageSomevalue, 0, "multi-ledger value is still 0");
    });

    it("gets multi-ledger value", async function () {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let nonAdmin = accounts[19];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("allowance", someUser, otherUser, 10, { from: admin });

      let storageSomevalue = await storage.getMultiLedgerValue("allowance", someUser, otherUser, { from: nonAdmin });
      assert.equal(storageSomevalue, 10, "multi-ledger value was getted by non-admin");
    });

    it("gets multi-ledger primary address count", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let anotherUser = accounts[23];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("someledger", someUser, anotherUser, 37, { from: admin });
      await storage.setMultiLedgerValue("someledger", otherUser, anotherUser, 73, { from: admin });

      let ledgerCount = await storage.primaryLedgerCount("someledger", { from: nonAdmin });
      assert.equal(ledgerCount, 2, "primary ledger count was getted");
    });

    it("gets multi-ledger primary address by index", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let anotherUser = accounts[23];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("someledger", someUser, anotherUser, 37, { from: admin });
      await storage.setMultiLedgerValue("someledger", otherUser, anotherUser, 73, { from: admin });

      let ledgerEntry = await storage.primaryLedgerEntryForIndex(web3.sha3("someledger"), 1, { from: nonAdmin });
      assert.equal(ledgerEntry, otherUser, "primary ledger entry was getted");
    });

    it("gets multi-ledger secondary address count", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let anotherUser = accounts[23];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("someledger", someUser, otherUser, 37, { from: admin });
      await storage.setMultiLedgerValue("someledger", someUser, anotherUser, 73, { from: admin });

      let ledgerCount = await storage.secondaryLedgerCount("someledger", someUser, { from: nonAdmin });
      assert.equal(ledgerCount, 2, "secondary ledger count was getted");
    });

    it("gets multi-ledger secondary address by index", async function() {
      let someUser = accounts[12];
      let otherUser = accounts[13];
      let anotherUser = accounts[23];
      let nonAdmin = accounts[14];

      await storage.addAdmin(admin);
      await storage.setMultiLedgerValue("someledger", someUser, anotherUser, 37, { from: admin });
      await storage.setMultiLedgerValue("someledger", someUser, otherUser, 73, { from: admin });

      let ledgerEntry = await storage.secondaryLedgerEntryForIndex(web3.sha3("someledger"), someUser, 1, { from: nonAdmin });
      assert.equal(ledgerEntry, otherUser, "secondary ledger entry was getted");
    });
  });
});
