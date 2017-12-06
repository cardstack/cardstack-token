const { assertRevert, wait } = require('../lib/utils');
const SoftwareAndServiceCredit = artifacts.require("./SoftwareAndServiceCredit.sol");

contract('SoftwareAndServiceCredit', function(accounts) {
  let ssc;
  let owner = accounts[0];
  let admin = accounts[5];
  let recipient = accounts[6];

  xdescribe("issue SSC", function() {
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
      assert.equal(event.args.admin, owner, "The admin is correct");
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
      assert.equal(event.args.admin, admin, "The admin is correct");
      assert.equal(event.args.amount, "10", "The amount is correct");
    });

    it("should not allow non-admin to issue SSC", async function() {
      await assertRevert(async () => await ssc.issueSSC(recipient, 10, { from: recipient }));

      let balance = await ssc.balanceOf(recipient);
      let lastActiveTime = await ssc.lastActiveTime(recipient);
      let hasExpired = await ssc.hasExpired(recipient);

      assert.equal(balance.toNumber(), 0, "the SSC balance is correct");
      assert.equal(hasExpired, false, "the SSC has not expired");
      assert.equal(lastActiveTime.toNumber(), 0, "SSC activity has been recorded for recipient");
    });
  });

  xdescribe("manage admins", function() {
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
      await assertRevert(async () => await ssc.addAdmin(admin, { from: admin }));

      let isAdmin = await ssc.admins(admin);

      assert.ok(!isAdmin, "admin was not added");
    });

    it("should not allow non-owner to remove an admin address", async function() {
      let nonOwner = accounts[2];

      await ssc.addAdmin(admin, { from: owner });

      await assertRevert(async () => await ssc.removeAdmin(admin, { from: nonOwner }));

      let isAdmin = await ssc.admins(admin);

      assert.ok(isAdmin, "admin was not removed");
    });
  });

  xdescribe("manage application contracts", function() {
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
      await assertRevert(async () => await ssc.addApplicationContract(appContract, { from: nonAdmin }));

      let isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(!isAppContract, "application contract was not added");
    });

    it("should not allow non-admin to remove an application contract", async function() {
      await ssc.addApplicationContract(appContract, { from: admin });

      await assertRevert(async () => await ssc.removeApplicationContract(appContract, { from: nonAdmin }));

      let isAppContract = await ssc.applicationContracts(appContract);

      assert.ok(isAppContract, "application contract was not removed");
    });
  });

  xdescribe("burn SSC", function() {
    let appContract = accounts[8];
    let user = accounts[9];

    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
      await ssc.addApplicationContract(appContract, { from: owner });
      await ssc.issueSSC(user, 100);
      await wait(2);
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
      assert.equal(event.args.account, user, "the account is correct");
      assert.equal(event.args.amount, "90", "the amount is correct");
    });

    it("should allow application contract to burn expired SSC", async function() {
      let lastActiveTime = await ssc.lastActiveTime(user);
      await ssc.setSscExpiration(1, { from: owner });
      await wait(2);

      let txn = await ssc.burn(user, 90, { from: appContract });

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 0, 'the balance was updated correctly');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');

      assert.equal(txn.logs.length, 1, 'an event was fired');

      let event = txn.logs[0];

      assert.equal(event.event, "SSCExpired", "the event type is correct");
      assert.equal(event.args.appContract, appContract, "the appContract is correct");
      assert.equal(event.args.account, user, "the account is correct");
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

  xdescribe("expire SSC", function() {
    let user = accounts[9];

    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
    });

    it("hasExpired should return false when the account has never had SSC activity", async function() {
      let user = accounts[7];
      let isExpired = await ssc.hasExpired(user, { from: user });

      assert.notOk(isExpired, 'SSC hasExpired is set correctly');
    });

    it("hasExpired should return false when SSC activity has occured before the expiration period", async function() {
      await ssc.issueSSC(user, 100);
      let isExpired = await ssc.hasExpired(user, { from: user });

      assert.notOk(isExpired, 'SSC hasExpired is set correctly');
    });

    it("hasExpired should return true when SSC activity has not occured during the expiration period", async function() {
      await ssc.issueSSC(user, 100);
      await wait(2);
      await ssc.setSscExpiration(1, { from: owner });

      let isExpired = await ssc.hasExpired(user, { from: user });

      assert.ok(isExpired, 'SSC hasExpired is set correctly');
    });

    it("should not allow a non-owner to change the SSC expiration period", async function() {
      let expirationTime = await ssc.sscExpirationSeconds();
      let exceptionThrown;

      try {
        await ssc.setSscExpiration(10, { from: user });
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when non-owner tries to change the expiration time");

      let unchangedExpiration = await ssc.sscExpirationSeconds();
      assert.equal(expirationTime.toNumber(), unchangedExpiration.toNumber(), 'The expiration time was not changed');
    });
  });

  xdescribe("freeze SSC", function() {
    let user = accounts[9];

    beforeEach(async function() {
      ssc = await SoftwareAndServiceCredit.new();
    });

    it("should not allow SSC to be burned when the account is frozen", async function() {
      await ssc.issueSSC(user, 100);
      let lastActiveTime = await ssc.lastActiveTime(user);
      await wait(2);

      let txn = await ssc.freezeAccount(user, true);

      let exceptionThrown;

      try {
        await ssc.burn(user, 90);
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when account is frozen");

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance is corect');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');
      assert.equal(txn.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(txn.logs[0].args.target, user, 'the target value is correct');
      assert.equal(txn.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("should not allow SSC to be issued when the account is frozen", async function() {
      await ssc.freezeAccount(user, true);
      let exceptionThrown;

      try {
        await ssc.issueSSC(user, 100);
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when account is frozen");

      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 0, 'the balance is corect');
    });

    it("should not allow non-owner to freeze SSC account", async function() {
      let exceptionThrown;

      try {
        await ssc.freezeAccount(user, true, { from: user });
      } catch (e) {
        exceptionThrown = true;
      }
      let isFrozen = await ssc.frozenAccount(user);
      assert.ok(exceptionThrown, "Exception was thrown when non-owner tries to freeze account");
      assert.notOk(isFrozen, "the account is not frozen");
    });

    it("should not allow non-owner to freeze SSC token", async function() {
      let exceptionThrown;

      try {
        await ssc.freezeToken(true, { from: user });
      } catch (e) {
        exceptionThrown = true;
      }
      let isFrozen = await ssc.frozenToken();
      assert.ok(exceptionThrown, "Exception was thrown when non-owner tries to freeze token");
      assert.notOk(isFrozen, "the token is not frozen");
    });

    it("should allow the SSC account to be unfrozen", async function() {
      await ssc.freezeAccount(user, true);
      let txn = await ssc.freezeAccount(user, false);

      await ssc.issueSSC(user, 100);

      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance is corect');
      assert.equal(txn.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(txn.logs[0].args.target, user, 'the target value is correct');
      assert.equal(txn.logs[0].args.frozen, false, 'the frozen value is correct');
    });

    it("should not allow SSC to be burned when the token is frozen", async function() {
      await ssc.issueSSC(user, 100);
      let lastActiveTime = await ssc.lastActiveTime(user);
      await wait(2);

      let txn = await ssc.freezeToken(true);

      let exceptionThrown;

      try {
        await ssc.burn(user, 90);
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when token is frozen");

      let newLastActiveTime = await ssc.lastActiveTime(user);
      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance is corect');
      assert.equal(newLastActiveTime.toNumber(), lastActiveTime.toNumber(), 'the lastActiveTime for the user was not changed');
      assert.equal(txn.logs[0].event, 'FrozenToken', 'the token freeze event is correct');
      assert.equal(txn.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("should not allow SSC to be issued when the token is frozen", async function() {
      await ssc.freezeToken(true);
      let exceptionThrown;

      try {
        await ssc.issueSSC(user, 100);
      } catch (e) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Exception was thrown when token is frozen");

      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 0, 'the balance is corect');
    });

    it("should allow the SSC token to be unfrozen", async function() {
      await ssc.freezeToken(true);
      let txn = await ssc.freezeToken(false);

      await ssc.issueSSC(user, 100);

      let balance = await ssc.balanceOf(user);

      assert.equal(balance.toNumber(), 100, 'the balance is corect');
      assert.equal(txn.logs[0].event, 'FrozenToken', 'the token freeze event is correct');
      assert.equal(txn.logs[0].args.frozen, false, 'the frozen value is correct');
    });
  });

});
