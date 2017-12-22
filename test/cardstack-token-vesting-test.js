const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const { increaseTimeTo, duration, latestTime } = require("../lib/time.js");
const {
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert
} = require("../lib/utils");

contract('CardStackToken', function(accounts) {

  describe("vested tokens", function() {
    let cst;
    let ledger;
    let storage;
    let registry;
    let beneficiary = accounts[3];
    let superAdmin = accounts[5];

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
      await cst.addSuperAdmin(superAdmin);
    });

    it("should return no vesting schedule for a beneficiary that doesn't have a vesting schedule", async function() {
      let rando = accounts[19];
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(rando);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");
    });

    it("should allow a super admin to apply a vesting schedule to a beneficiary", async function() {
      let vestingMappingCount = await cst.vestingMappingSize();
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();

      assert.equal(vestingMappingCount, 0, "the vestingMappingSize is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens, 0, "the total unvested & unreleased tokens is correct");

      let start = this.start + duration.weeks(2);
      let txn = await cst.grantVestedTokens(beneficiary,
                                            10,
                                            start,
                                            duration.years(1),
                                            duration.years(2),
                                            false);

      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 10, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, start, "the vesting startDate is correct");
      assert.equal(actualCliffDate, start + duration.years(1), "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, duration.years(2), "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let event = txn.logs[0];
      assert.equal(event.event, "VestedTokenGrant", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary is correct");
      assert.equal(event.args.startDate.toNumber(), start, "the start date is correct");
      assert.equal(event.args.cliffDate.toNumber(), start + duration.years(1), "The cliff is correct");
      assert.equal(event.args.durationSec.toNumber(), duration.years(2), "The durationSec is correct");
      assert.equal(event.args.fullyVestedAmount.toNumber(), 10, "The fullyVestedAmount is correct");
      assert.equal(event.args.isRevocable, false, "The isRevocable is correct");

      vestingMappingCount = await cst.vestingMappingSize();
      assert.equal(vestingMappingCount, 1, "the vestingMappingSize is correct");

      let firstVestingBeneficiary = await cst.vestingBeneficiaryForIndex(0);
      assert.equal(firstVestingBeneficiary, beneficiary, "the vestingBeneficiaryForIndex is correct for the first beneficiary");

      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);
      let beneficiaryBalance = await cst.balanceOf(beneficiary);
      totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();

      assert.equal(totalUnvestedAndUnreleasedTokens, 10, "the total unvested & unreleased tokens is correct");
      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 10, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 90, "The balanceOf the cst contract is correct");
      assert.equal(beneficiaryBalance.toNumber(), 0, "The beneficiary's balance is correct");
    });

    it("should allow a super admin to apply a vesting schedule to a beneficiary using `now` as the start date", async function() {
      let start = this.start;
      let marginOfError = duration.minutes(1);

      let txn = await cst.grantVestedTokens(beneficiary,
                                            10,
                                            0,
                                            duration.years(1),
                                            duration.years(2),
                                            false);

      let [ actualStartDate,
            actualCliffDate,
            ,
            actualFullyVestedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 10, "the fullyVestedAmount is correct");
      assert.isAtLeast(actualStartDate.toNumber(), start - marginOfError, "the vesting startDate is within tolerance");
      assert.isAtLeast(actualCliffDate.toNumber(), start + duration.years(1) - marginOfError, "the vesting cliffDate is within tolerance");
      assert.isAtMost(actualStartDate.toNumber(), start + marginOfError, "the vesting startDate is within tolerance");
      assert.isAtMost(actualCliffDate.toNumber(), start + duration.years(1) + marginOfError, "the vesting cliffDate is within tolerance");

      let event = txn.logs[0];
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary is correct");
      assert.isAtLeast(event.args.startDate.toNumber(), start - marginOfError, "the start date is within tolerance");
      assert.isAtLeast(event.args.cliffDate.toNumber(), start + duration.years(1) - marginOfError, "The cliff is within tolerance");
      assert.isAtMost(event.args.startDate.toNumber(), start + marginOfError, "the start date is within tolerance");
      assert.isAtMost(event.args.cliffDate.toNumber(), start + duration.years(1) + marginOfError, "The cliff is within tolerance");
    });


    it("should not allow a vested token grant to be created that would exceed the circulationCap when fully vested", async function() {
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 10, 1000000, NULL_ADDRESS);

      let start = this.start;
      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 11,
                                                                 start,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 false));
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedTokens.toNumber(), 0, "the total unvested tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
    });

    it("should not allow a vested token grant to be created that would exceed the total number of tokens minted when fully vested", async function() {
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), 200, 1000000, NULL_ADDRESS);

      let start = this.start;
      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 101,
                                                                 start,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 false));
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedTokens.toNumber(), 0, "the total unvested tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
    });

    it("should not allow a vested token grant to be created where the cliff is larger than the duration of the vesting", async function() {
      let start = this.start;
      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 10,
                                                                 start,
                                                                 duration.years(2),
                                                                 duration.years(1),
                                                                 false));

      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedAndUnreleasedTokens, 0, "the total unvested & unreleased tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
    });

    it("should not allow a vested token grant to a beneficiary that has unvested tokens", async function() {
      let start = this.start;
      await cst.grantVestedTokens(beneficiary,
                                  5,
                                  start,
                                  duration.years(1),
                                  duration.years(2),
                                  false);

      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 10,
                                                                 start,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 false));
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount.toNumber(), 5, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount.toNumber(), 0, "the vestedAmount is correct");
      assert.equal(actualStartDate.toNumber(), start, "the vesting startDate is correct");
      assert.equal(actualCliffDate.toNumber(), start + duration.years(1), "the vesting cliffDate is correct");
      assert.equal(actualDurationSec.toNumber(), duration.years(2), "The vesting duration is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedAndUnreleasedTokens, 5, "the total unvested & unreleased tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 5, "The totalInCirculation is correct");
    });

    it("should not allow a vested token grant to a beneficiary that has unreleased vested tokens", async function() {
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let start = this.start;
      let fullyVestedAmount = 20;

      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + duration.years(1.5));
      await cst.releaseVestedTokens({ from: beneficiary }); // releases 15 tokens
      await increaseTimeTo(start + vestingDuration + duration.days(1)); // fully vested now, but 5 unreleased tokens

      await assertRevert(async () => await cst.grantVestedTokens(beneficiary,
                                                                 10,
                                                                 0,
                                                                 vestingCliff,
                                                                 vestingDuration,
                                                                 false));

      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 20, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 20, "the fullyVestedAmount is correct");
      assert.equal(actualStartDate, start, "the vesting startDate is correct");
      assert.equal(actualCliffDate, start + vestingCliff, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, vestingDuration, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 15, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedAndUnreleasedTokens, 5, "the total unvested & unreleased tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 20, "The totalInCirculation is correct");
    });

    it("should not allow a vested token grant to a beneficiary with a null address", async function() {
      let start = this.start;
      await assertRevert(async () => await cst.grantVestedTokens(NULL_ADDRESS,
                                                                 10,
                                                                 start,
                                                                 duration.years(1),
                                                                 duration.years(2),
                                                                 false));

      let totalUnvestedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let vestingMappingCount = await cst.vestingMappingSize();

      assert.equal(vestingMappingCount, 0, "the vestingMappingSize is correct");
      assert.equal(totalUnvestedTokens.toNumber(), 0, "the total unvested tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
    });

    it("should allow a new vested token grant to be applied to a beneficiary that is already a beneficiary for a vesting schedule that has fully vested and all tokens released", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);

      let vestingDuration2 = duration.years(1);
      let vestingCliff2 = duration.years(0.5);

      await cst.grantVestedTokens(beneficiary,
                                  5,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + vestingDuration);
      await cst.releaseVestedTokens({ from: beneficiary });

      start = await latestTime();
      start += duration.minutes(1);

      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  start,
                                  vestingCliff2,
                                  vestingDuration2,
                                  false);

      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 10, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, start, "the vesting startDate is correct");
      assert.equal(actualCliffDate, start + vestingCliff2, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, vestingDuration2, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedAndUnreleasedTokens, 10, "the total unvested & unreleased tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 15, "The totalInCirculation is correct");
    });

    it("should allow a new vested token grant to be applied to a beneficiary that is already a beneficiary for a vesting schedule that has been revoked", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);

      let vestingDuration2 = duration.years(1);
      let vestingCliff2 = duration.years(0.5);

      await cst.grantVestedTokens(beneficiary,
                                  20,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);
      await increaseTimeTo(start + duration.years(1.5));

      await cst.revokeVesting(beneficiary);

      start = await latestTime();
      start += duration.minutes(1);

      await cst.grantVestedTokens(beneficiary,
                                  10,
                                  start,
                                  vestingCliff2,
                                  vestingDuration2,
                                  false);
      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualFullyVestedAmount, 10, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, start, "the vesting startDate is correct");
      assert.equal(actualCliffDate, start + vestingCliff2, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, vestingDuration2, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");

      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 10, "the total unvested & unreleased tokens is correct");
      assert.equal(totalInCirculation.toNumber(), 25, "The totalInCirculation is correct");
    });

    it("should allow a beneficiary to release vested tokens for themselves after cliff date", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + duration.years(1.5));

      let txn = await cst.releaseVestedTokens({ from: beneficiary });
      let releaseTime = web3.eth.getBlock(txn.receipt.blockNumber).timestamp;
      let expectedReleaseAmount = Math.floor(fullyVestedAmount * (releaseTime - start) / vestingDuration);

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), expectedReleaseAmount, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount - expectedReleaseAmount, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), expectedReleaseAmount, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), expectedReleaseAmount, "the vesting released amount is correct");

      assert.equal(txn.logs.length, 2, "there are 2 events that were fired");
      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._from, cst.address, "the _from field is correct");
      assert.equal(event.args._to, beneficiary, "the _to field is correct");
      assert.equal(event.args._value, expectedReleaseAmount, "the _value field is correct");

      event = txn.logs[1];
      assert.equal(event.event, "VestedTokenRelease", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
      assert.equal(event.args.amount, expectedReleaseAmount, "the amount field is correct");
    });

    it("should allow a anyone to release vested tokens for a named beneficiary after cliff date", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + duration.years(1.5));

      let { receipt } = await cst.releaseVestedTokensForBeneficiary(beneficiary, { from: accounts[33] });
      let releaseTime = web3.eth.getBlock(receipt.blockNumber).timestamp;
      let expectedReleaseAmount = Math.floor(fullyVestedAmount * (releaseTime - start) / vestingDuration);

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();

      assert.equal(balance.toNumber(), expectedReleaseAmount, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount - expectedReleaseAmount, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), expectedReleaseAmount, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), expectedReleaseAmount, "the vesting released amount is correct");
    });

    it("should allow a beneficiary to linearly release vested tokens for themselves after cliff date and before the end of vesting schedule", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      let checkpoints = 10;

      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      let lastVestedAmount = 0;

      for (let i = 0; i < checkpoints; i++) {
        let now = start + vestingCliff + i * ((vestingDuration - vestingCliff) / checkpoints);
        await increaseTimeTo(now);

        let txn = await cst.releaseVestedTokens({ from: beneficiary });
        let expectedVestingAmount = Math.floor(fullyVestedAmount * (now - start) / vestingDuration);
        let expectedReleaseAmount = expectedVestingAmount - lastVestedAmount;
        lastVestedAmount = expectedVestingAmount;

        let balance = await cst.balanceOf(beneficiary);
        let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
        let totalTokens = await cst.totalSupply();
        let totalInCirculation = await cst.totalInCirculation();
        let balanceOfCstContract = await cst.balanceOf(cst.address);

        assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
        assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
        assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
        assert.equal(balance.toNumber(), expectedVestingAmount, "the beneficiary's CST balance is correct");
        assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount - expectedVestingAmount, "the total unvested & unreleased tokens is correct");

        let [ , , , ,
              actualVestedAmount,
              actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

        assert.equal(actualVestedAmount.toNumber(), expectedVestingAmount, "the fullyVestedAmount is correct");
        assert.equal(actualReleasedAmount.toNumber(), expectedVestingAmount, "the vesting released amount is correct");

        assert.equal(txn.logs.length, 2, "there are 2 events that were fired");
        let event = txn.logs[0];
        assert.equal(event.event, "Transfer", "The event type is correct");
        assert.equal(event.args._from, cst.address, "the _from field is correct");
        assert.equal(event.args._to, beneficiary, "the _to field is correct");
        assert.equal(event.args._value.toNumber(), expectedReleaseAmount, "the _value field is correct");

        event = txn.logs[1];
        assert.equal(event.event, "VestedTokenRelease", "The event type is correct");
        assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
        assert.equal(event.args.amount.toNumber(), expectedReleaseAmount, "the amount field is correct");
      }
    });

    it("should allow a beneficiary to release the fully vested amount after the vesting duration", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);

      await increaseTimeTo(start + duration.years(2) + duration.minutes(5));

      let txn = await cst.releaseVestedTokens({ from: beneficiary });

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), fullyVestedAmount, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), fullyVestedAmount, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), fullyVestedAmount, "the vesting released amount is correct");

      assert.equal(txn.logs.length, 2, "there are 2 events that were fired");
      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._from, cst.address, "the _from field is correct");
      assert.equal(event.args._to, beneficiary, "the _to field is correct");
      assert.equal(event.args._value, 100, "the _value field is correct");

      event = txn.logs[1];
      assert.equal(event.event, "VestedTokenRelease", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
      assert.equal(event.args.amount, 100, "the amount field is correct");
    });

    it("should allow a beneficiary to release the remaining fully vested amount after the vesting duration", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + duration.years(1.5));

      await cst.releaseVestedTokens({ from: beneficiary });

      await increaseTimeTo(start + duration.years(2) + duration.minutes(5));

      let txn = await cst.releaseVestedTokens({ from: beneficiary });

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), fullyVestedAmount, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), fullyVestedAmount, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), fullyVestedAmount, "the vesting released amount is correct");

      assert.equal(txn.logs.length, 2, "there are 2 events that were fired");
      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._from, cst.address, "the _from field is correct");
      assert.equal(event.args._to, beneficiary, "the _to field is correct");
      assert.equal(event.args._value, 25, "the _value field is correct");

      event = txn.logs[1];
      assert.equal(event.event, "VestedTokenRelease", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
      assert.equal(event.args.amount, 25, "the amount field is correct");
    });

    it("should not allow a beneficiary to release unvested tokens before cliff date", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + vestingCliff - duration.minutes(1));

      let txn = await cst.releaseVestedTokens({ from: beneficiary });

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 0, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");

      assert.equal(txn.logs.length, 0, "there are no events that were fired");
    });

    it("should not allow anyone to release unvested tokens for a named beneficiary before cliff date", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);
      await increaseTimeTo(start + vestingCliff - duration.minutes(1));

      let txn = await cst.releaseVestedTokensForBeneficiary(beneficiary, { from: accounts[33] });

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 0, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");

      assert.equal(txn.logs.length, 0, "there are no events that were fired");
    });

    it("should allow a super admin to revoke a revocable vesting schedule where unreleased tokens are sent to the beneficiary when revoked after the cliff", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);
      await increaseTimeTo(start + duration.years(1.5));

      let txn = await cst.revokeVesting(beneficiary, { from: superAdmin });

      let revokeDate = web3.eth.getBlock(txn.receipt.blockNumber).timestamp;
      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 75, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 25, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 75, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 75, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 75, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), revokeDate, "the revoke date is correct");

      assert.equal(txn.logs.length, 3, "there are 3 events that were fired");
      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._from, cst.address, "the _from field is correct");
      assert.equal(event.args._to, beneficiary, "the _to field is correct");
      assert.equal(event.args._value, 75, "the _value field is correct");

      event = txn.logs[1];
      assert.equal(event.event, "VestedTokenRelease", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
      assert.equal(event.args.amount, 75, "the amount field is correct");

      event = txn.logs[2];
      assert.equal(event.event, "VestedTokenRevocation", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
    });

    it("should allow a super admin to revoke a revocable vesting schedule where no tokens are sent to the beneficiary when revoked before the cliff", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);
      await increaseTimeTo(start + vestingCliff - duration.minutes(1));

      let txn = await cst.revokeVesting(beneficiary, { from: superAdmin });

      let revokeDate = web3.eth.getBlock(txn.receipt.blockNumber).timestamp;
      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 100, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 0, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), revokeDate, "the revoke date is correct");

      assert.equal(txn.logs.length, 1, "there is 1 event that were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "VestedTokenRevocation", "The event type is correct");
      assert.equal(event.args.beneficiary, beneficiary, "the beneficiary field is correct");
    });

    it("should not allow a super admin to revoke a tokens that have been fully vested", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);

      await increaseTimeTo(start + duration.years(2) + duration.minutes(5));

      await assertRevert(async () => await cst.revokeVesting(beneficiary, { from: superAdmin }));

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), fullyVestedAmount, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), fullyVestedAmount, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), 0, "the revoke date is correct");
    });

    it("should not allow a super admin to revoke an unrevocable vesting schedule", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  false);

      await increaseTimeTo(start + duration.years(1.5));

      await assertRevert(async () => await cst.revokeVesting(beneficiary, { from: superAdmin }));

      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), fullyVestedAmount, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 0, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 100, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 75, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), 0, "the revoke date is correct");
    });

    it("should not allow a super admin to re-revoke a recocable vesting schedule", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);
      await increaseTimeTo(start + duration.years(1.5));

      let txn = await cst.revokeVesting(beneficiary, { from: superAdmin });

      await increaseTimeTo(start + duration.years(1.5) + duration.minutes(1));

      await assertRevert(async () => await cst.revokeVesting(beneficiary, { from: superAdmin }));

      let revokeDate = web3.eth.getBlock(txn.receipt.blockNumber).timestamp;
      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 75, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 25, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 75, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 75, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 75, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), revokeDate, "the revoke date is correct");
    });

    it("should not allow a super admin to revoke a non-existant vesting schedule", async function() {
      let rando = accounts[42];

      await assertRevert(async () => await cst.revokeVesting(rando, { from: superAdmin }));

      let balance = await cst.balanceOf(rando);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 100, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 0, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ actualStartDate,
            actualCliffDate,
            actualDurationSec,
            actualFullyVestedAmount,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate,
            actualIsRevocable ] = await cst.getVestingSchedule(rando);

      assert.equal(actualFullyVestedAmount, 0, "the fullyVestedAmount is correct");
      assert.equal(actualVestedAmount, 0, "the vestedAmount is correct");
      assert.equal(actualStartDate, 0, "the vesting startDate is correct");
      assert.equal(actualCliffDate, 0, "the vesting cliffDate is correct");
      assert.equal(actualDurationSec, 0, "The vesting duration is correct");
      assert.equal(actualReleasedAmount, 0, "the vesting released amount is correct");
      assert.equal(actualRevokeDate, 0, "the vesting revoke date is correct");
      assert.equal(actualIsRevocable, false, "the vesting isRevocable field is correct");
    });

    it("should not allow beneficiary to release more tokens than vested at revoke date", async function() {
      let start = this.start;
      let vestingDuration = duration.years(2);
      let vestingCliff = duration.years(1);
      let fullyVestedAmount = 100;
      await cst.grantVestedTokens(beneficiary,
                                  fullyVestedAmount,
                                  start,
                                  vestingCliff,
                                  vestingDuration,
                                  true);
      await increaseTimeTo(start + duration.years(1.5));

      let revokeTxn = await cst.revokeVesting(beneficiary, { from: superAdmin });

      await increaseTimeTo(start + duration.years(1.9));

      let txn = await cst.releaseVestedTokensForBeneficiary(beneficiary);

      let revokeDate = web3.eth.getBlock(revokeTxn.receipt.blockNumber).timestamp;
      let balance = await cst.balanceOf(beneficiary);
      let totalUnvestedAndUnreleasedTokens = await cst.totalUnvestedAndUnreleasedTokens();
      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(totalTokens.toNumber(), 100, "The totalTokens is correct");
      assert.equal(totalInCirculation.toNumber(), 75, "The totalInCirculation is correct");
      assert.equal(balanceOfCstContract.toNumber(), 25, "The balanceOf the cst contract is correct");
      assert.equal(balance.toNumber(), 75, "the beneficiary's CST balance is correct");
      assert.equal(totalUnvestedAndUnreleasedTokens.toNumber(), 0, "the total unvested & unreleased tokens is correct");

      let [ , , , ,
            actualVestedAmount,
            actualReleasedAmount,
            actualRevokeDate ] = await cst.getVestingSchedule(beneficiary);

      assert.equal(actualVestedAmount.toNumber(), 75, "the fullyVestedAmount is correct");
      assert.equal(actualReleasedAmount.toNumber(), 75, "the vesting released amount is correct");
      assert.equal(actualRevokeDate.toNumber(), revokeDate, "the revoke date is correct");

      assert.equal(txn.logs.length, 0, "there are no events that were fired");
    });

  });
});
