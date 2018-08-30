const { proxyContract } = require('./utils');
const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CST_BUY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  asInt,
  assertRevert,
  checkBalance
} = require("../lib/utils");

const TestingCardstackToken = artifacts.require("./TestingCardstackToken.sol");
const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const TestingRegistry = artifacts.require("./TestingRegistry.sol");

contract('CardstackToken', function(accounts) {
  let ledger;
  let storage;
  let cst;
  let registry;
  let proxyAdmin = accounts[41];

  describe("buy()", function() {
    beforeEach(async function() {
      ledger = (await proxyContract(TestingCstLedger, proxyAdmin)).contract;
      storage = await Storage.new();
      registry = (await proxyContract(TestingRegistry, proxyAdmin)).contract;
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = (await proxyContract(TestingCardstackToken, proxyAdmin, registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      })).contract;
      await registry.register("CST", cst.address, CARDSTACK_NAMEHASH);
      await cst.freezeToken(false);

      for (let i = 0; i < accounts.length; i++) {
        await checkBalance(accounts[i], 1);
      }
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.freezeToken(true);
      await cst.configure(0x0, 0x0, 0, 0, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("an approved buyer should be able to purchase CST", async function() {
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(10, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      await ledger.mintTokens(web3.toWei(10, "ether"));
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(2, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.addBuyer(buyerAccount);

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < CST_BUY_GAS_LIMIT, `Less than ${CST_BUY_GAS_LIMIT} gas was used for the txn`);
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance.toString(), web3.toWei(2, "ether").toString(), "The CST balance is correct");
      assert.equal(totalInCirculation.toString(), web3.toWei(2, "ether"), "The CST total in circulation was updated correctly");
      assert.equal(balanceOfCstContract.toString(), web3.toWei(8, "ether").toString(), "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value.toString(), web3.toWei(2, "ether").toString(), "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("a non approved buyer cannot purchase CST", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(10, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);

      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

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
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the amount of ethers in the buyers wallet", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(10, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);

      let buyerAccount = accounts[1];
      let startBalance = await web3.eth.getBalance(buyerAccount);
      let txnValue = web3.toWei(web3.fromWei(startBalance, "ether") + 1, "ether");

      await cst.addBuyer(buyerAccount);

      if (asInt(txnValue) < asInt(startBalance)) {
        throw new Error(`Buyer account ${buyerAccount} has too much value to be able to conduct this test ${startBalance}`);
      }

      startBalance = asInt(startBalance);

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }), "sender doesn't have enough funds");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase CST when haltPurchase is `true`", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(15, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(8, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);
      await cst.setHaltPurchase(true);

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
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can purchase CST when haltPurchase is `false` after being `true`", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(15, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(8, "ether");

      await cst.addBuyer(buyerAccount);
      await cst.setHaltPurchase(true);
      await cst.setHaltPurchase(false);

      await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(cstBalance, web3.toWei(8, 'ether'), "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), web3.toWei(8, 'ether'), "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than has been minted", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(15, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(11, "ether");
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
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can purchase fractional CST (less than purchase price for a single CST)", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(15, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);

      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(0.9, "ether");

      await cst.addBuyer(buyerAccount);

      await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(cstBalance, web3.toWei(0.9, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(0.9, 'ether'), "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the CST circulationCap", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(5, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(6, "ether");
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
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST when the circulationCap is 0", async function() {
      await ledger.mintTokens(web3.toWei(10, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, 0, web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[1];
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
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("allows a buyer to buy up to the balance limit", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(100, "ether"), web3.toWei(2, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(2, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.addBuyer(buyerAccount);

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < CST_BUY_GAS_LIMIT, `Less than ${CST_BUY_GAS_LIMIT} gas was used for the txn`);
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, web3.toWei(2, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(2, 'ether'), "The CST total in circulation was updated correctly");
      assert.equal(asInt(balanceOfCstContract), web3.toWei(98, 'ether'), "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value, web3.toWei(2, 'ether'), "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("does not allow buyer to buy enough CST to surpass the balance limit", async function() {
      let buyerAccount = accounts[1];
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await ledger.debitAccount(buyerAccount, web3.toWei(1, 'ether'));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(100, "ether"), web3.toWei(2, "ether"), NULL_ADDRESS);
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);
      await cst.addBuyer(buyerAccount);

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, web3.toWei(1, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(1, 'ether'), "The CST total in circulation was not updated");
      assert.equal(balanceOfCstContract, web3.toWei(99, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("does not allow whitelisted buyer to buy CST when they have no custom balance limit and the default balance limit is 0", async function() {
      let buyerAccount = accounts[1];
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await ledger.debitAccount(buyerAccount, web3.toWei(1, 'ether'));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(100, "ether"), 0, NULL_ADDRESS);
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);
      await cst.addBuyer(buyerAccount);

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, web3.toWei(1, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(1, 'ether'), "The CST total in circulation was not updated");
      assert.equal(balanceOfCstContract, web3.toWei(99, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("allows a buyer to buy up to a custom balance limit", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(100, "ether"), web3.toWei(2, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(4, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.setCustomBuyer(buyerAccount, web3.toWei(4, 'ether'));

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < CST_BUY_GAS_LIMIT, `Less than ${CST_BUY_GAS_LIMIT} gas was used for the txn`);
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 4, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, web3.toWei(4, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(4, 'ether'), "The CST total in circulation was updated correctly");
      assert.equal(balanceOfCstContract, web3.toWei(96, 'ether'), "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value, web3.toWei(4, 'ether'), "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("does not allows a buyer to buy enough CST to exceed custom balance limit", async function() {
      let buyerAccount = accounts[1];
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await ledger.debitAccount(buyerAccount, web3.toWei(1, 'ether'));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 1, web3.toWei(100, "ether"), web3.toWei(2, "ether"), NULL_ADDRESS);
      let txnValue = web3.toWei(4, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      await cst.setCustomBuyer(buyerAccount, web3.toWei(4, 'ether'));

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, web3.toWei(1, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(1, 'ether'), "The CST total in circulation was not updated");
      assert.equal(balanceOfCstContract, web3.toWei(99, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("allows a purchase of CST when buyer buys more than the contribution minimum", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 10, web3.toWei(100, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(1, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.addBuyer(buyerAccount);
      await cst.setContributionMinimum(web3.toWei(5, 'ether'));

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < CST_BUY_GAS_LIMIT, `Less than ${CST_BUY_GAS_LIMIT} gas was used for the txn`);
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 1, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, web3.toWei(10, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(10, 'ether'), "The CST total in circulation was updated correctly");
      assert.equal(balanceOfCstContract, web3.toWei(90, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("allows a purchase of CST when buyer buys upto the contirbution miniumum when they already have a CST balance", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 10, web3.toWei(100, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(0.5, "ether");

      await cst.addBuyer(buyerAccount);
      await cst.setContributionMinimum(web3.toWei(5, 'ether'));
      await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });
      await cst.setContributionMinimum(web3.toWei(6, 'ether'));
      await cst.buy({
        from: buyerAccount,
        value: web3.toWei(0.1, "ether"),
        gasPrice: GAS_PRICE
      });

      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(cstBalance, web3.toWei(6, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(6, 'ether'), "The CST total in circulation was updated correctly");
      assert.equal(balanceOfCstContract, web3.toWei(94, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("allows a purchase of CST when the buyer has more than the contribution minimum as a CST balance, and makes a new purchase that is less than the contribution minimum", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 10, web3.toWei(100, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(0.2, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.addBuyer(buyerAccount);
      await cst.setContributionMinimum(web3.toWei(5, 'ether'));
      await cst.setHaltPurchase(true);
      await cst.grantTokens(buyerAccount, web3.toWei(5, 'ether'));
      await cst.setHaltPurchase(false);

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < CST_BUY_GAS_LIMIT, `Less than ${CST_BUY_GAS_LIMIT} gas was used for the txn`);
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 0.2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, web3.toWei(7, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(7, 'ether'), "The CST total in circulation was updated correctly");
      assert.equal(balanceOfCstContract, web3.toWei(93, 'ether'), "The balanceOf the cst contract is correct");
    });

    it("does not allow a purchase when the buyer has no CST balance and make a purchase less than the contribution minimum", async function() {
      await ledger.mintTokens(web3.toWei(100, "ether"));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 10, web3.toWei(100, "ether"), web3.toWei(1000000, "ether"), NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(0.2, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      await cst.addBuyer(buyerAccount);
      await cst.setContributionMinimum(web3.toWei(5, 'ether'));

      await assertRevert(async () => await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      }));

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance.toNumber(), 0, "The CST balance is correct");
      assert.equal(totalInCirculation.toNumber(), 0, "The CST total in circulation was not updated");
      assert.equal(balanceOfCstContract, web3.toWei(100, 'ether'), "The balanceOf the cst contract is correct");
    });

  });
});
