const {
  GAS_PRICE,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
  asInt,
  checkBalance
} = require("../lib/utils");
const { increaseTimeTo, duration, latestTime } = require("../lib/time.js");

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

    beforeEach(async function() {
      this.start = await latestTime() + duration.minutes(1);
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
      await registry.register("CST", cst.address, CARDSTACK_NAMEHASH);

      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 100, 1000000, NULL_ADDRESS);

      await checkBalance(frozenAccount, 1);
      await cst.addBuyer(frozenAccount);
      await cst.setAllowTransfers(true);
      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });


      let frozenCount = await cst.totalFrozenAccountsMapping();
      let isFrozen = await cst.frozenAccount(frozenAccount);

      assert.notOk(isFrozen, "the account is not frozen");
      assert.equal(frozenCount, 0, "the frozenCount is correct");

      await cst.freezeAccount(frozenAccount, true);
    });

    it("cannot buy CST when frozen", async function() {
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      startBalance = asInt(startBalance);

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

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

      await assertRevert(async () => await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      }));

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

      await assertRevert(async () => await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      }));

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

    it("does not allow increasing allowance when spender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(spender, true);

      await assertRevert(async () => await cst.increaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow increasing allowance when grantor account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(grantor, true);

      await assertRevert(async () => await cst.increaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow decreasing allowance when spender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(spender, true);

      await assertRevert(async () => await cst.decreaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow decreasing allowance when grantor account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(grantor, true);

      await assertRevert(async () => await cst.decreaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow approving allowance when spender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(spender, true);

      await assertRevert(async () => await cst.approve(spender, 10, { from: grantor }));
    });

    it("does not allow approving allowance when grantor account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeAccount(grantor, true);

      await assertRevert(async () => await cst.approve(spender, 10, { from: grantor }));
    });

    it("does not allow transferFrom when sender account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(spender, true);

      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 10, { from: spender }));
    });

    it("does not allow transferFrom when 'from' account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(grantor, true);

      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 10, { from: spender }));
    });

    it("does not allow transferFrom when 'to' account has been frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeAccount(recipient, true);

      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 10, { from: spender }));
    });

    it("does not allow token grant to frozen account", async function() {
      let recipientAccount = accounts[9];
      await cst.freezeAccount(recipientAccount, true);
      await assertRevert(async () => await cst.grantTokens(recipientAccount, 10));
    });

    it("does not allow vested token grant to frozen account", async function() {
      let beneficiary = accounts[9];
      await cst.freezeAccount(beneficiary, true);
      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 10,
                                                                 0,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 true));
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.vestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");
    });

    it("does not allow frozen account to release vested tokens for beneficiary", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeAccount(beneficiary, true);

      await assertRevert(async () => await cst.releaseVestedTokens({ from: beneficiary }));

      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });

    it("does not allow frozen account to release vested tokens for named beneficiary", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeAccount(beneficiary, true);

      await assertRevert(async () => await cst.releaseVestedTokensForBeneficiary(beneficiary));

      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });

    it("does not allow frozen account to have vesting revoked", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeAccount(beneficiary, true);

      await assertRevert(async () => await cst.revokeVesting(beneficiary));

      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });
  });

  describe("frozen token", function() {
    let frozenAccount = accounts[5];

    beforeEach(async function() {
      this.start = await latestTime() + duration.minutes(1);
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

      await registry.register("CST", cst.address, CARDSTACK_NAMEHASH);
      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 100, 1000000, NULL_ADDRESS);

      await cst.setAllowTransfers(true);
      await checkBalance(frozenAccount, 1);

      await cst.addBuyer(frozenAccount);
      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    it("should allow account to be frozen when token is frozen", async function() {
      await cst.freezeToken(true);

      await cst.freezeAccount(frozenAccount, true);

      let isFrozen = await cst.frozenAccount(frozenAccount);

      assert.equal(isFrozen, true, 'the account was frozen while the token was frozen');
    });

    it("should not be able to mint tokens when token is frozen", async function() {
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.mintTokens(100));

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
    });

    it("should not be able to grant tokens when token is frozen", async function() {
      await cst.freezeToken(true);
      await assertRevert(async () => await cst.grantTokens(frozenAccount, 10));

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();
      let recipientBalance = await ledger.balanceOf(frozenAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 10, "The balance is correct");
    });

    it("cannot buy CST when frozen", async function() {
      await cst.freezeToken(true);
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      startBalance = asInt(startBalance);

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await ledger.balanceOf(buyerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      await cst.freezeToken(true);
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      await assertRevert(async () => await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      }));

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

      await cst.freezeToken(true);

      await assertRevert(async () => await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      }));

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("should be able to unfreeze entire token", async function() {
      await cst.freezeToken(true);
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

    it("does not allow increasing allowance when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeToken(true);

      await assertRevert(async () => await cst.increaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow decreasing allowance when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.decreaseApproval(spender, 10, { from: grantor }));
    });

    it("does not allow approving allowance when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst.freezeToken(true);

      await assertRevert(async () => await cst.approve(spender, 10, { from: grantor }));
    });

    it("does not allow transferFrom when token frozen", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await cst.approve(spender, 10, { from: grantor });
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.transferFrom(grantor, recipient, 10, { from: spender }));
    });

    it("does not allow vested token grant when token is frozen", async function() {
      await cst.freezeToken(true);

      let beneficiary = accounts[9];
      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 10,
                                                                 0,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 true));
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.vestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");
    });

    it("does not allow release vested tokens for beneficiary when token is frozen", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.releaseVestedTokens({ from: beneficiary }));

      await cst.freezeToken(false);
      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });

    it("does not allow release vested tokens for named beneficiary when token is frozen", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.releaseVestedTokensForBeneficiary(beneficiary));

      await cst.freezeToken(false);
      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });

    it("does not allow vesting revocations when token is frozen", async function() {
      let beneficiary = accounts[9];
      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  0,
                                  duration.years(1),
                                  duration.years(2),
                                  true);
      await increaseTimeTo(this.start + duration.years(1.5));
      await cst.freezeToken(true);

      await assertRevert(async () => await cst.revokeVesting(beneficiary));

      await cst.freezeToken(false);
      let balance = await cst.balanceOf(beneficiary);
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
    });
  });
});
