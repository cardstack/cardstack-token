const Bluebird = require('bluebird');
const SoftwareAndServiceCredit = artifacts.require("./SoftwareAndServiceCredit.sol");

contract('SoftwareAndServiceCredit', function(accounts) {
  let ssc;
  let owner = accounts[0];
  let admin = accounts[5];
  let recipient = accounts[6];

  describe("issue SSC", function() {
    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
      await ssc.addAdmin(admin, { from: owner });
    });

    it("should allow owner to issue SSC", async function() {
      let txn = await ssc.issueSSC(recipient, 10, { from: owner });

      let balance = await ssc.balanceOf(recipient);
      let lastActiveTime = await ssc.lastActiveTime(recipient);
      let hasExpired = await ssc.hasExpired(recipient);

      assert.equal(balance.toNumber(), 10, "the SSC balance is correct");
      assert.equal(hasExpired, false, "the SSC has not expired");
      assert.ok(lastActiveTime.toNumber(), "SSC activity has been recorded for recipient");

      assert.equal(txn.logs.length, 1, "An event was fired");

      let event = txn.logs[0];

      assert.equal(event.event, "SSCIssued", "The event type is correct");
      assert.equal(event.args.recipient, recipient, "The recipient is correct");
      assert.equal(event.args.recipientAddress, recipient, "The recipientAddress is correct");
      assert.equal(event.args.admin, owner, "The admin is correct");
      assert.equal(event.args.adminAddress, owner, "The adminAddress is correct");
      assert.equal(event.args.amount, "10", "The amount is correct");
    });

    it("should allow admin contract to issue SSC", async function() {
      let txn = await ssc.issueSSC(recipient, 10, { from: admin });

      let balance = await ssc.balanceOf(recipient);
      let lastActiveTime = await ssc.lastActiveTime(recipient);
      let hasExpired = await ssc.hasExpired(recipient);

      assert.equal(balance.toNumber(), 10, "the SSC balance is correct");
      assert.equal(hasExpired, false, "the SSC has not expired");
      assert.ok(lastActiveTime.toNumber(), "SSC activity has been recorded for recipient");

      assert.equal(txn.logs.length, 1, "An event was fired");

      let event = txn.logs[0];

      assert.equal(event.event, "SSCIssued", "The event type is correct");
      assert.equal(event.args.recipient, recipient, "The recipient is correct");
      assert.equal(event.args.recipientAddress, recipient, "The recipientAddress is correct");
      assert.equal(event.args.admin, admin, "The admin is correct");
      assert.equal(event.args.adminAddress, admin, "The adminAddress is correct");
      assert.equal(event.args.amount, "10", "The amount is correct");
    });

    it("should not allow non-admin to issue SSC", async function() {
      let exceptionThrown;

      try {
        await ssc.issueSSC(recipient, 10, { from: recipient });
      } catch (e) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown when non admin tries to issue SSC");

      let balance = await ssc.balanceOf(recipient);
      let lastActiveTime = await ssc.lastActiveTime(recipient);
      let hasExpired = await ssc.hasExpired(recipient);

      assert.equal(balance.toNumber(), 0, "the SSC balance is correct");
      assert.equal(hasExpired, false, "the SSC has not expired");
      assert.equal(lastActiveTime.toNumber(), 0, "SSC activity has been recorded for recipient");
    });
  });

  describe("manage admins", function() {
    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
    });

    it("should allow owner to add a new admin address", async function() {
      let isAdmin = await ssc.admins(admin);
      assert.ok(!isAdmin, "admin not yet set");

      await ssc.addAdmin(admin, { from: owner });

      isAdmin = await ssc.admins(admin);

      assert.ok(isAdmin, "owner added an admin");
    });

    it("should allow owner to remove an admin address", async function() {
      await ssc.addAdmin(admin, { from: owner });

      await ssc.removeAdmin(admin);

      let isAdmin = await ssc.admins(admin);
      assert.ok(!isAdmin, "owner removed an admin");
    });

    it("should not allow non-owner to add a new admin address", async function() {
      let exceptionThrown;

      try {
        await ssc.addAdmin(admin, { from: admin });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non admin tries to add an admin");

      let isAdmin = await ssc.admins(admin);

      assert.ok(!isAdmin, "admin was not added");
    });

    it("should not allow non-owner to remove an admin address", async function() {
      let exceptionThrown;
      let nonOwner = accounts[2];

      await ssc.addAdmin(admin, { from: owner });

      try {
        await ssc.removeAdmin(admin, { from: nonOwner });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non admin tries to remove an admin");

      let isAdmin = await ssc.admins(admin);

      assert.ok(isAdmin, "admin was not removed");
    });
  });

  describe("manage application contracts", function() {
    let appContract = accounts[8];
    let nonAdmin = accounts[7];

    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
      await ssc.addAdmin(admin, { from: owner });
    });

    it("should allow admin to add a new application contract", async function() {
      let isAppContract = await ssc.applicationContracts(appContract);
      assert.ok(!isAppContract, "Application contract not yet set");

      await ssc.addApplicationContract(appContract, { from: admin });

      isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(isAppContract, "admin added an application contract");
    });

    it("should allow admin to remove an application contract", async function() {
      await ssc.addApplicationContract(appContract, { from: admin });

      await ssc.removeApplicationContract(appContract, { from: admin });

      let isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(!isAppContract, "admin removed an application contract");
    });

    it("should not allow non-admin to add a new application contract", async function() {
      let exceptionThrown;

      try {
        await ssc.addApplicationContract(appContract, { from: nonAdmin });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non admin tries to add an applicationContract");

      let isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(!isAppContract, "application contract was not added");
    });

    it("should not allow non-admin to remove an application contract", async function() {
      await ssc.addApplicationContract(appContract, { from: admin });

      let exceptionThrown;

      try {
        await ssc.removeApplicationContract(appContract, { from: nonAdmin });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non admin tries to remove an applicationContract");

      let isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(isAppContract, "application contract was not removed");
    });
  });

  describe("burn SSC", function() {
    let appContract = accounts[8];
    let user = accounts[9];

    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
      await ssc.addApplicationContract(appContract, { from: owner });
      await ssc.issueSSC(user, 100);
      await new Bluebird.Promise(res => setTimeout(() => res(), 2 * 1000)); // pause a moment so that the last active time will be different
    });

    it("should allow application contract to burn non-expired SSC", async function() {
      let lastActiveTime = await ssc.lastActiveTime(user);

      let txn = await ssc.burn(user, 90, { from: appContract });

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 10, 'the balance was updated correctly');
      assert.ok(newLastActiveTime.toNumber() > lastActiveTime.toNumber(), 'the lastActiveTime for the user was increased');

      assert.equal(txn.logs.length, 1, 'an event was fired');

      let event = txn.logs[0];

      assert.equal(event.event, "SSCBurned", "the event type is correct");
      assert.equal(event.args.appContract, appContract, "the appContract is correct");
      assert.equal(event.args.appContractAddress, appContract, "the appContractAddress is correct");
      assert.equal(event.args.account, user, "the account is correct");
      assert.equal(event.args.accountAddress, user, "the accountAddress is correct");
      assert.equal(event.args.amount, "90", "the amount is correct");
    });

    it("should allow application contract to burn expired SSC", async function() {
      let lastActiveTime = await ssc.lastActiveTime(user);
      await ssc.setSscExpiration(1, { from: owner });
      await new Bluebird.Promise(res => setTimeout(() => res(), 2 * 1000));

      let txn = await ssc.burn(user, 90, { from: appContract });

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 0, 'the balance was updated correctly');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');

      assert.equal(txn.logs.length, 1, 'an event was fired');

      let event = txn.logs[0];

      assert.equal(event.event, "SSCExpired", "the event type is correct");
      assert.equal(event.args.appContract, appContract, "the appContract is correct");
      assert.equal(event.args.appContractAddress, appContract, "the appContractAddress is correct");
      assert.equal(event.args.account, user, "the account is correct");
      assert.equal(event.args.accountAddress, user, "the accountAddress is correct");
      assert.equal(event.args.amount, "100", "the amount is correct");
    });

    it("should not allow non-application contract to burn SSC", async function() {
      let lastActiveTime = await ssc.lastActiveTime(user);
      let exceptionThrown;

      try {
        await ssc.burn(user, 90, { from: user });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non app contract tries to burn SSC");

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance was updated correctly');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');
    });

    it("should not allow application contract to burn more SSC than in user's balance", async function() {
      let lastActiveTime = await ssc.lastActiveTime(user);
      let exceptionThrown;

      try {
        await ssc.burn(user, 101, { from: appContract });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when app contract tries to burn  more SSC than user has");

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance was updated correctly');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');
    });
  });

  describe("expire SSC", function() {
    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
    });

    xit("hasExpired should return false when the account has never had SSC activity", async function() {
    });

    xit("hasExpired should return false when SSC activity has occured before the expiration period", async function() {
    });

    xit("hasExpired should return true when SSC activity has not occured during the expiration period", async function() {
    });

    xit("should allow the owner to change the SSC expiration period", async function() {
    });

    xit("should not allow a non-owner to change the SSC expiration period", async function() {
    });
  });

  describe("freeze SSC", function() {
    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
    });

    xit("should not allow SSC to be burned when the account is frozen", async function() {
    });

    xit("should not allow SSC to be issued when the account is frozen", async function() {
    });

    xit("should not allow SSC to be burned when the token is frozen", async function() {
    });

    xit("should not allow SSC to be issued when the token is frozen", async function() {
    });
  });

});
