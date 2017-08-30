const {
  checkBalance,
  asInt,
  NULL_ADDRESS,
  MAX_FAILED_TXN_GAS,
  ROUNDING_ERROR_WEI,
  GAS_PRICE
} = require("../lib/utils");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");
const CstRewards = artifacts.require("./CstRewards.sol");

contract('CardStackToken', function(accounts) {
  let cst1;
  let cst2;
  let ledger;
  let storage;
  let registry;
  let admin = accounts[2];

  describe("contract upgrade", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst1 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      cst2 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");

      await storage.addAdmin(cst1.address);
      await storage.addAdmin(cst2.address);
      await ledger.addAdmin(cst1.address);
      await ledger.addAdmin(cst2.address);
      await ledger.mintTokens(100);
      await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst2.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst1.addAdmin(admin);
      await cst2.addAdmin(admin);
    });

    it("does not allow an admin to add a superAdmin", async function() {
      let exceptionThrown;

      try {
        await cst1.addSuperAdmin(admin, { from: admin });
      } catch (err) {
        exceptionThrown = true;
      }

      let isSuperAdmin = await cst1.superAdmins(admin);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.notOk(isSuperAdmin, "The admin was not set");
    });

    it("does not allow an admin to remove a superAdmin", async function() {
      let superAdmin = accounts[1];
      await cst1.addSuperAdmin(superAdmin);
      let exceptionThrown;

      try {
        await cst1.removeAdmin(superAdmin, { from: admin });
      } catch (err) {
        exceptionThrown = true;
      }

      let isSuperAdmin = await cst1.superAdmins(superAdmin);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.ok(isSuperAdmin, "The admin was not removed");
    });

    it("does allow a superAdmin to add an admin", async function() {
      let superAdmin = accounts[1];
      let newAdmin = accounts[9];
      await cst1.addSuperAdmin(superAdmin);

      await cst1.addAdmin(newAdmin, { from: superAdmin });

      let isAdmin = await cst1.admins(newAdmin);

      assert.ok(isAdmin, "admin was added");
    });

    it("does allow a superAdmin to remove an admin", async function() {
      let superAdmin = accounts[1];
      await cst1.addSuperAdmin(superAdmin);

      await cst1.removeAdmin(admin, { from: superAdmin });
      let isAdmin = await cst1.admins(admin);

      assert.notOk(isAdmin, "admin was removed");
    });

    it("does not allow a non-owner to add an admin", async function() {
      let nonOwner = accounts[9];
      let exceptionThrown;

      try {
        await cst1.addAdmin(nonOwner, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      let isAdmin = await cst1.admins(nonOwner);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.notOk(isAdmin, "The admin was not set");
    });

    it("does not allow a non-owner to remove an admin", async function() {
      let nonOwner = accounts[9];
      let exceptionThrown;

      try {
        await cst1.removeAdmin(admin, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      let isAdmin = await cst1.admins(admin);

      assert.ok(exceptionThrown, "exception was thrown");
      assert.ok(isAdmin, "The admin was not removed");
    });

    it("does not allow a non-admin to invoke upgradeTo", async function() {
      let nonAdmin = accounts[8];
      let exceptionThrown;

      try {
        await cst1.upgradeTo(cst2.address, { from: nonAdmin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown");

      let isDeprecatedCst1 = await cst1.isDeprecated();
      let cst1Successor = await cst1.successor();
      let cst1Predecessor = await cst1.predecessor();

      assert.notOk(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst1Successor, NULL_ADDRESS, 'the contract address is correct');
    });

    it("does not allow a non-admin to invoke upgradeFrom", async function() {
      let nonAdmin = accounts[8];
      let exceptionThrown;

      try {
        await cst2.upgradeTo(cst1.address, { from: nonAdmin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "exception was thrown");

      let isDeprecatedCst2 = await cst2.isDeprecated();
      let cst2Successor = await cst2.successor();
      let cst2Predecessor = await cst2.predecessor();

      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');
    });

    it("can indiciate if the contract is deprecated", async function() {
      let isDeprecatedCst1 = await cst1.isDeprecated();
      let isDeprecatedCst2 = await cst2.isDeprecated();
      let cst1Successor = await cst1.successor();
      let cst2Successor = await cst2.successor();
      let cst1Predecessor = await cst1.predecessor();
      let cst2Predecessor = await cst2.predecessor();

      assert.notOk(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst1Successor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');

      let upgradeToTxn = await cst1.upgradeTo(cst2.address);
      let upgradedFromTxn = await cst2.upgradedFrom(cst1.address);

      isDeprecatedCst1 = await cst1.isDeprecated();
      isDeprecatedCst2 = await cst2.isDeprecated();
      cst1Successor = await cst1.successor();
      cst2Successor = await cst2.successor();
      cst1Predecessor = await cst1.predecessor();
      cst2Predecessor = await cst2.predecessor();

      assert.ok(isDeprecatedCst1, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedCst2, "the isDeprecated value is correct");
      assert.equal(cst1Predecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(cst2Predecessor, cst1.address, 'the contract address is correct');
      assert.equal(cst1Successor, cst2.address, 'the contract address is correct');
      assert.equal(cst2Successor, NULL_ADDRESS, 'the contract address is correct');

      assert.equal(upgradeToTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradedFromTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradeToTxn.logs[0].event, "Upgraded", "the event type is correct");
      assert.equal(upgradeToTxn.logs[0].args.successor, cst2.address);
      assert.equal(upgradedFromTxn.logs[0].event, "UpgradedFrom", "the event type is correct");
      assert.equal(upgradedFromTxn.logs[0].args.predecessor, cst1.address);
    });
  });

  describe("contract upgrade - successor contract", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst1 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      cst2 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");

      await storage.addAdmin(cst1.address);
      await storage.addAdmin(cst2.address);
      await ledger.addAdmin(cst1.address);
      await ledger.addAdmin(cst2.address);
      await ledger.mintTokens(100);
      await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst2.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst1.addSuperAdmin(admin);
      await cst2.addSuperAdmin(admin);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst2.address);

      await cst2.setFoundation(accounts[0]);
      await cst2.setMinimumBalance(0);
      await cst2.foundationWithdraw(cstEth.toNumber());
    });

    it("allows purchase of CST for successor contract", async function() {
      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10, NULL_ADDRESS);

      let buyerAccount = accounts[8];
      checkBalance(buyerAccount, 2);

      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst2.address);

      startBalance = asInt(startBalance);

      let txn = await cst2.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst2.address);
      let cstBalance = await cst2.balanceOf(buyerAccount);
      let totalInCirculation = await cst2.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 150000, "Less than 150000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, 2, "The CST balance is correct");
      assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");
    });

    it("allows selling of CST for successor contract", async function() {
      let sellerAccount = accounts[2];
      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.buy({
        from: sellerAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let startWalletBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 10;
      startWalletBalance = asInt(startWalletBalance);

      let txn = await cst2.sell(sellAmount, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);

      let { cumulativeGasUsed } = txn.receipt;
      let endWalletBalance = await web3.eth.getBalance(sellerAccount);
      let endCstBalance = await cst2.balanceOf(sellerAccount);
      let totalInCirculation = await cst2.totalInCirculation();

      endWalletBalance = asInt(endWalletBalance);

      assert.ok(cumulativeGasUsed < 50000, "Less than 50000 gas was used for the txn");
      assert.ok(Math.abs(startWalletBalance + (sellAmount * web3.toWei(0.1, "ether")) - (GAS_PRICE * cumulativeGasUsed) - endWalletBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet credited correctly");
      assert.equal(asInt(endCstBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was updated correctly");
    });

    it("allows transfer of CST for successor contract", async function() {
      let senderAccount = accounts[3];
      let recipientAccount = accounts[4];
      await ledger.debitAccount(senderAccount, 10);
      await cst2.upgradedFrom(cst1.address, { from: admin });
      let transferAmount = 10;

      let txn = await cst2.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);

      let senderBalance = await cst2.balanceOf(senderAccount);
      let recipientBalance = await cst2.balanceOf(recipientAccount);
      let totalInCirculation = await cst2.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("allows minting of CST for successor contract", async function() {
      await cst2.upgradedFrom(cst1.address, { from: admin });
      let txn = await cst2.mintTokens(100);

      assert.ok(txn.receipt);

      let totalTokens = await cst2.totalTokens();
      let sellCap = await cst2.sellCap();
      let totalInCirculation = await cst2.totalInCirculation();

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });

    it("allows granting of CST for successor contract", async function() {
      await cst2.upgradedFrom(cst1.address, { from: admin });
      let recipientAccount = accounts[9];

      let txn = await cst2.grantTokens(recipientAccount, 20);

      assert.ok(txn.receipt);

      let totalTokens = await cst2.totalTokens();
      let totalInCirculation = await cst2.totalInCirculation();
      let recipientBalance = await cst2.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 20, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 20, "The recipientBalance is correct");
    });

    it("allows set buy and sell price of CST for successor contract", async function() {
      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"));

      let sellPrice = await cst2.sellPrice();
      let buyPrice = await cst2.buyPrice();

      assert.equal(asInt(sellPrice), web3.toWei(2, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(1, "ether"), "The buyPrice is correct");
    });

    it("allows set sellCap of CST for successor contract", async function() {
      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.setSellCap(20);

      let sellCap = await cst2.sellCap();

      assert.equal(asInt(sellCap), 20, "The sellCap is correct");
    });

    it("allows foundationWithdraw and foundationDeposit for successor contract", async function() {
      let foundation = accounts[24];
      await cst2.setFoundation(foundation);

      let txnValue = web3.toWei(1, "ether");
      let startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      await cst2.upgradedFrom(cst1.address, { from: admin });

      let txn = await cst2.foundationDeposit({
        from: foundation,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let { cumulativeGasUsed } = txn.receipt;
      let endCstBalance = await web3.eth.getBalance(cst2.address);
      let endFoundationBalance = await web3.eth.getBalance(foundation);
      endCstBalance = asInt(endCstBalance);
      endFoundationBalance = asInt(endFoundationBalance);

      // doing math in ethers to prevent overflow errors
      let finalBalance = parseFloat(web3.fromWei(startFoundationBalance, "ether"))
                       - parseFloat(web3.fromWei(GAS_PRICE * cumulativeGasUsed, "ether"))
                       - parseFloat(web3.fromWei(txnValue, "ether"))
                       - parseFloat(web3.fromWei(endFoundationBalance, "ether"));

      assert.ok(cumulativeGasUsed < 40000, "Less than 40000 gas was used for the txn");
      assert.ok(Math.abs(finalBalance) < parseFloat(web3.fromWei(ROUNDING_ERROR_WEI, "ether")), "Foundations's wallet balance was changed correctly");
      assert.equal(endCstBalance, txnValue, "The CST balance is correct");

      startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      txn = await cst2.foundationWithdraw(txnValue, {
        from: foundation,
        gasPrice: GAS_PRICE
      });

      cumulativeGasUsed = txn.receipt.cumulativeGasUsed;
      endCstBalance = await web3.eth.getBalance(cst2.address);
      endFoundationBalance = await web3.eth.getBalance(foundation);
      endCstBalance = asInt(endCstBalance);
      endFoundationBalance = asInt(endFoundationBalance);

      // doing math in ethers to prevent overflow errors
      finalBalance = parseFloat(web3.fromWei(startFoundationBalance, "ether"))
                   + parseFloat(web3.fromWei(txnValue, "ether"))
                   - parseFloat(web3.fromWei(GAS_PRICE * cumulativeGasUsed, "ether"))
                   - parseFloat(web3.fromWei(endFoundationBalance, "ether"));

      assert.ok(cumulativeGasUsed < 40000, "Less than 40000 gas was used for the txn");
      assert.ok(Math.abs(finalBalance) < parseFloat(web3.fromWei(ROUNDING_ERROR_WEI, "ether")), "Foundations's wallet balance was changed correctly");
      assert.equal(endCstBalance, 0, "The CST balance is correct");
    });

    it("allows adding rewards contract for successor contract", async function() {
      let rewards = await CstRewards.new();
      await registry.register("rewards", rewards.address, false);

      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.setRewardsContractName("rewards", { from: admin });

      let observedRewards = await cst2.rewardsContract();

      assert.equal(observedRewards, rewards.address, "the rewards contract is correct");
    });

    it("allows approving allowance for successor contract", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst2.upgradedFrom(cst1.address, { from: admin });

      await cst2.approve(spender, 10, { from: grantor });

      let allowance = await cst2.allowance(grantor, spender);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
    });

    it("allows transferFrom for successor contract", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await ledger.debitAccount(grantor, 50);

      await cst2.approve(spender, 10, { from: grantor });

      await cst2.upgradedFrom(cst1.address, { from: admin });
      await cst2.transferFrom(grantor, recipient, 10, { from: spender });

      let grantorBalance = await cst2.balanceOf(grantor);
      let recipientBalance = await cst2.balanceOf(recipient);
      let allowance = await cst2.allowance(grantor, spender);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 40, "the balance is correct");
      assert.equal(asInt(recipientBalance), 10, "the balance is correct");
    });
  });

  describe("contract upgrade - predecessor contract", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst1 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      cst2 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");

      await storage.addAdmin(cst1.address);
      await storage.addAdmin(cst2.address);
      await ledger.addAdmin(cst1.address);
      await ledger.addAdmin(cst2.address);
      await ledger.mintTokens(100);
      await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst2.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      await cst1.addSuperAdmin(admin);
      await cst2.addSuperAdmin(admin);
    });

    it("does not allow purchase of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let buyerAccount = accounts[4];
      checkBalance(buyerAccount, 1);
      let txnValue = web3.toWei(0.1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst1.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await ledger.balanceOf(buyerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("does not allow selling of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let sellerAccount = accounts[2];
      await ledger.debitAccount(sellerAccount, 10);
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 10;
      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst1.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await ledger.balanceOf(sellerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("does not allow transfer of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let transferAmount = 10;
      let senderAccount = accounts[8];
      let recipientAccount = accounts[9];
      await ledger.debitAccount(senderAccount, 10);

      let exceptionThrown;
      try {
        await cst1.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("does not allow minting of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });

      let exceptionThrown;
      try {
        await cst1.mintTokens(1000);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });

    it("does not allow token grant of CST when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let recipientAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst1.grantTokens(recipientAccount, 10);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();
      let recipientBalance = await ledger.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });

    it("does not allow set buy and set prices when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"));
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let buyPrice = await storage.getUIntValue("cstBuyPrice");
      let sellPrice = await storage.getUIntValue("cstSellPrice");

      assert.equal(asInt(sellPrice), web3.toWei(0.1, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, "ether"), "The buyPrice is correct");
    });

    it("does not allow set sell cap when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.setsellcap(20);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellCap = await storage.getUIntValue("cstSellCap");

      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
    });

    it("does not allow cstAvailableToBuy when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.cstAvailableToBuy();
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");
    });

    it("does not allow updatedLedgerStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let newLedger = await CstLedger.new();
      let exceptionThrown;
      try {
        await cst1.updateLedgerStorage(newLedger.address);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow updatedExternalStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let newStorage = await Storage.new();
      let exceptionThrown;
      try {
        await cst1.updateExternalStorage(newStorage.address);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow initialize when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow initializeFromStorage when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.initializeFromStorage();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow name() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.name();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow symbol() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.symbol();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow totalInCirculation() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.totalInCirculation();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow totalTokens() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.totalTokens();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow balanceOf() when the contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.balanceOf(accounts[5]);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    it("does not allow setFoundation when contract has been upgraded", async function() {
      let foundation = accounts[24];
      await cst1.upgradeTo(cst2.address, { from: admin });

      let exceptionThrown;
      try {
        await cst1.setFoundation(foundation);
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");
    });

    // yes we intentionally allow this to change after contract has been upgraded so foundation can recoup all ethers for the deprecated contract
    it("does allow setMinimumBalance when contract has been upgraded", async function() {
      await cst1.upgradeTo(cst2.address, { from: admin });
      await cst1.setMinimumBalance(web3.toWei(0.1, "ether"));

      let resultingMinBalance = await cst1.minimumBalance();

      assert.equal(resultingMinBalance.toNumber(), web3.toWei(0.1, "ether"), "the minimumBalance is correct");
    });

    // yes we intentionally allow this to change after contract has been upgraded so foundation can recoup all ethers for the deprecated contract
    it("does allow foundationWithdraw when contract has been upgraded", async function() {
      let foundation = accounts[34];
      let txnValue = web3.toWei(0.1, "ether");
      await cst1.setFoundation(foundation);
      await cst1.foundationDeposit({
        from: foundation,
        value: txnValue,
        gasPrice: GAS_PRICE
      });
      await cst1.upgradeTo(cst2.address, { from: admin });

      let startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      let txn = await cst1.foundationWithdraw(txnValue, {
        from: foundation,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));

      let { cumulativeGasUsed } = txn.receipt;
      let endCstBalance = await web3.eth.getBalance(cst1.address);
      let endFoundationBalance = await web3.eth.getBalance(foundation);
      endCstBalance = asInt(endCstBalance);
      endFoundationBalance = asInt(endFoundationBalance);

      // doing math in ethers to prevent overflow errors
      let finalBalance = parseFloat(web3.fromWei(startFoundationBalance, "ether"))
                       + parseFloat(web3.fromWei(txnValue, "ether"))
                       - parseFloat(web3.fromWei(GAS_PRICE * cumulativeGasUsed, "ether"))
                       - parseFloat(web3.fromWei(endFoundationBalance, "ether"));

      assert.ok(cumulativeGasUsed < 40000, "Less than 40000 gas was used for the txn");
      assert.ok(Math.abs(finalBalance) < parseFloat(web3.fromWei(ROUNDING_ERROR_WEI, "ether")), "Foundations's wallet balance was changed correctly");
      assert.equal(endCstBalance, 0, "The CST balance is correct");
    });

    it("does not allow foundationDeposit when contract has been upgraded", async function() {
      let foundation = accounts[34];
      let txnValue = web3.toWei(0.1, "ether");
      await cst1.upgradeTo(cst2.address, { from: admin });

      let startFoundationBalance = await web3.eth.getBalance(foundation);

      let exceptionThrown;
      try {
        await cst1.foundationDeposit({
          from: foundation,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");

      let endCstBalance = await web3.eth.getBalance(cst1.address);
      let endFoundationBalance = await web3.eth.getBalance(foundation);

      assert.ok(startFoundationBalance.toNumber() - endFoundationBalance.toNumber() < MAX_FAILED_TXN_GAS * GAS_PRICE, "The foundations's account was just charged for gas");
      assert.equal(endCstBalance.toNumber(), 0, "The CST balance is correct");
    });

    it("does not allow adding a rewards contract when contract has been upgraded", async function() {
      let rewards = await CstRewards.new();
      await registry.register("rewards", rewards.address, false);
      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.setRewardsContractName("rewards", { from: admin });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow rewardsContract when contract has been upgraaded", async function() {
      let rewards = await CstRewards.new();
      await registry.register("rewards", rewards.address, false);
      await cst1.setRewardsContractName("rewards", { from: admin });

      await cst1.upgradeTo(cst2.address, { from: admin });

      let exceptionThrown;
      try {
        await cst1.rewardsContract();
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow approving allowance when contract has been upgraded", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];

      await cst1.upgradeTo(cst2.address, { from: admin });

      let exceptionThrown;
      try {
        await cst1.approve(spender, 10, { from: grantor });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");
    });

    it("does not allow transferFrom when contract has been upgraded", async function() {
      let grantor = accounts[3];
      let spender = accounts[4];
      let recipient = accounts[7];

      await ledger.debitAccount(grantor, 50);
      await cst1.approve(spender, 10, { from: grantor });

      await cst1.upgradeTo(cst2.address, { from: admin });
      let exceptionThrown;
      try {
        await cst1.transferFrom(grantor, recipient, 10, { from: spender });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");

      let grantorBalance = await ledger.balanceOf(grantor);
      let recipientBalance = await ledger.balanceOf(recipient);

      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");
    });
  });
});
