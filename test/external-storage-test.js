const {
  NULL_ADDRESS,
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

      assert.ok(isAdmin, "admin was added");
    });

    it("allows owner to remove an admin", async function() {
      await storage.addAdmin(admin);
      let isAdmin = await storage.admins(admin);

      assert.ok(isAdmin, "admin was added");

      await storage.removeAdmin(admin);
      isAdmin = await storage.admins(admin);

      assert.notOk(isAdmin, "admin was removed");
    });

    it("non-owner cannot add admins", async function() {
      let nonOwner = accounts[7];
      let exceptionThrown;

      try {
        await storage.addAdmin(admin, { from: nonOwner });
      } catch(err) {
        exceptionThrown = true;
      }

      let isAdmin = await storage.admins(admin);

      assert.ok(exceptionThrown, "Exception was thrown");
      assert.notOk(isAdmin, "admin was not added");
    });

    it("allows admin to set uint value", async function () {
      await storage.addAdmin(admin);
      await storage.setUIntValue("cstBuyPrice", 11, { from: admin });

      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice");
      assert.equal(storageBuyPrice, 11, "uint value was set by admin");
    });

    it("does not allow non-admin to set uint value", async function() {
      let nonAdmin = accounts[17];
      let exceptionThrown;

      try {
        await storage.setUIntValue("cstBuyPrice", 11, { from: nonAdmin });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to set uint as non-admin");
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
      let exceptionThrown;

      try {
        await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"), { from: nonAdmin });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to set bytes32 as non-admin");
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
      let exceptionThrown;

      try {
        await storage.setAddressValue("cstRewardPool", rewardPool, { from: someUser });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to set address as non-admin");
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
      let exceptionThrown;

      try {
        await storage.setBytesValue("somebytes", "lmnop", { from: someUser });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to set bytes as non-admin");
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
      let exceptionThrown;

      try {
        await storage.setBooleanValue("somebool", true, { from: someUser });
      } catch(e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown trying to set boolean as non-admin");
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
      let exceptionThrown;

      try {
        await storage.setIntValue("someint", 37, { from: someUser });
      } catch(e) {
        exceptionThrown = true;
      }

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

    xit("allows admin to set ledger value", async function () {
    });

    xit("does not allow non-admin to set ledger value", async function() {
    });

    xit("gets ledger value", async function () {
    });

    xit("gets ledger count", async function() {
    });

    xit("gets ledger address by index", async function() {
    });

    xit("allows admin to set multi-ledger value", async function () {
    });

    xit("does not allow non-admin to set multi-ledger value", async function() {
    });

    xit("gets multi-ledger value", async function () {
    });

    xit("gets multi-ledger primary address count", async function() {
    });

    xit("gets multi-ledger primary address by index", async function() {
    });

    xit("gets multi-ledger secondary address count", async function() {
    });

    xit("gets multi-ledger secondary address by index", async function() {
    });
  });
});
