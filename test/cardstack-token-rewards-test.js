const {
  GAS_PRICE,
  NULL_ADDRESS,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const CstRewards = artifacts.require("./CstRewards.sol");

contract('CardStackToken', function(accounts) {
  let superAdmin = accounts[3];
  let cst;
  let rewards;
  let ledger;

  describe("rewards contract", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      let storage = await Storage.new();
      let registry = await Registry.new();
      rewards = await CstRewards.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
      await registry.register("rewards", rewards.address, false);

      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(1, "ether"), 100, NULL_ADDRESS);
      await cst.addSuperAdmin(superAdmin);
    });

    it("allows a super admin to add a rewards contract", async function() {
      await cst.setRewardsContractName("rewards", { from: superAdmin });

      let observedRewards = await cst.rewardsContract();

      assert.equal(observedRewards, rewards.address, "the rewards contract is correct");
    });

    it("does not allow a non-super admin to add a rewards contract", async function() {
      let nonSuperAdmin = accounts[7];
      let exceptionThrown;
      try {
        await cst.setRewardsContractName("rewards", { from: nonSuperAdmin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
      let observedRewards = await cst.rewardsContract();

      assert.equal(observedRewards, NULL_ADDRESS, "the rewards contract is correct");
    });

    // Note that we are using some test state in our dummy rewards contract
    // to test that it was actually called. When this is implemented for real,
    // we need to adjust these tests to use some real reward contract state to
    //  test that it was actually called
    it("does not trigger reward contract's processReward when contract not set", async function() {
      let sender = accounts[8];
      let recipient = accounts[9];

      await ledger.debitAccount(sender, 10);

      await cst.transfer(recipient, 10, { from: sender });

      let processingRewards = await rewards.processingRewards();

      assert.notOk(processingRewards, "rewards processing was not triggered");
    });

    it("cst transfer triggers reward contract processReward", async function() {
      let sender = accounts[8];
      let recipient = accounts[9];

      await cst.setRewardsContractName("rewards", { from: superAdmin });

      await ledger.debitAccount(sender, 10);

      await cst.transfer(recipient, 10, { from: sender });

      let processingRewards = await rewards.processingRewards();

      assert.ok(processingRewards, "rewards processing was not triggered");
    });

    it("cst transferFrom triggers reward contract processReward", async function() {
      let grantor = accounts[7];
      let spender = accounts[8];
      let recipient = accounts[9];

      await cst.setRewardsContractName("rewards", { from: superAdmin });

      await ledger.debitAccount(grantor, 10);
      await cst.approve(spender, 10, { from: grantor });

      await cst.transferFrom(grantor, recipient, 10, { from: spender });

      let processingRewards = await rewards.processingRewards();

      assert.ok(processingRewards, "rewards processing was not triggered");
    });

    it("cst buy triggers reward contract processReward", async function() {
      let buyerAccount = accounts[8];

      await checkBalance(buyerAccount, 0.1);

      let txnValue = web3.toWei(0.1, "ether");

      await cst.setRewardsContractName("rewards", { from: superAdmin });

      await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let processingRewards = await rewards.processingRewards();

      assert.ok(processingRewards, "rewards processing was not triggered");
    });

    /* removing sell until after phase 2 */
    xit("cst sell triggers reward contract processReward", async function() {
      let sellerAccount = accounts[8];
      let foundation = accounts[10];
      await checkBalance(foundation, 1);
      await ledger.debitAccount(sellerAccount, 10);

      await cst.setRewardsContractName("rewards", { from: superAdmin });

      await cst.foundationDeposit({
        from: foundation,
        value: web3.toWei(1, "ether")
      });

      await cst.sell(1, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      });

      let processingRewards = await rewards.processingRewards();

      assert.ok(processingRewards, "rewards processing was not triggered");
    });

    it("cst grantToken triggers reward contract processReward", async function() {
      let recipient = accounts[9];

      await cst.setRewardsContractName("rewards", { from: superAdmin });

      await cst.grantTokens(recipient, 10);

      let processingRewards = await rewards.processingRewards();

      assert.ok(processingRewards, "rewards processing was not triggered");
    });
  });
});
