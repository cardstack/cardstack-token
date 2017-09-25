const {
  GAS_PRICE,
  ROUNDING_ERROR_WEI,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");

contract('CardStackToken', function(accounts) {
  let ledger;
  let storage;
  let cst;
  let registry;

  describe("buy()", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);

      for (let i = 0; i < accounts.length; i++) {
        await checkBalance(accounts[i], 1);
      }
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.configure(0x0, 0x0, 0, 0, 0, 0, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("an approved buyer should be able to purchase CST", async function() {
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10, 10, 1000000, NULL_ADDRESS);
      await ledger.mintTokens(10);
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

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 160000, "Less than 160000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, 2, "The CST balance is correct");
      assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");
      assert.equal(asInt(balanceOfCstContract), 8, "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 2, "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("a non approved buyer cannot purchase CST", async function() {
      await ledger.mintTokens(10);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10, 10, 1000000, NULL_ADDRESS);

      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the amount of ethers in the buyers wallet", async function() {
      await ledger.mintTokens(10);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10, 10, 1000000, NULL_ADDRESS);

      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(1000, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      if (asInt(txnValue) < asInt(startBalance)) {
        throw new Error(`Buyer account ${buyerAccount} has too much value to be able to conduct this test ${startBalance}`);
      }

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than has been minted", async function() {
      await ledger.mintTokens(10);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15, 15, 1000000, NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(11, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase fractional CST (less than purchase price for a single CST)", async function() {
      await ledger.mintTokens(10);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15, 15, 1000000, NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(0.9, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the CST sellCap", async function() {
      await ledger.mintTokens(10);
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(1, "ether"), web3.toWei(1, "ether"), 5, 5, 1000000, NULL_ADDRESS);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(6, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      await cst.addBuyer(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("allows a buyer to buy up to the balance limit", async function() {
      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"),
                          web3.toHex("CST"),
                          web3.toWei(1, "ether"),
                          web3.toWei(1, "ether"),
                          100,
                          10,
                          2,
                          NULL_ADDRESS);
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

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 160000, "Less than 160000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 2, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, 2, "The CST balance is correct");
      assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");
      assert.equal(asInt(balanceOfCstContract), 98, "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 2, "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("does not allow buyer to buy enough CST to surpass the balance limit", async function() {
      let buyerAccount = accounts[1];
      await ledger.mintTokens(100);
      await ledger.debitAccount(buyerAccount, 1);
      await cst.configure(web3.toHex("CardStack Token"),
                          web3.toHex("CST"),
                          web3.toWei(1, "ether"),
                          web3.toWei(1, "ether"),
                          100,
                          10,
                          2,
                          NULL_ADDRESS);
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);
      await cst.addBuyer(buyerAccount);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 1, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 1, "The CST total in circulation was not updated");
      assert.equal(asInt(balanceOfCstContract), 99, "The balanceOf the cst contract is correct");
    });

    it("allows a buyer to buy up to a custom balance limit", async function() {
      await ledger.mintTokens(100);
      await cst.configure(web3.toHex("CardStack Token"),
                          web3.toHex("CST"),
                          web3.toWei(1, "ether"),
                          web3.toWei(1, "ether"),
                          100,
                          10,
                          2,
                          NULL_ADDRESS);
      let buyerAccount = accounts[8];
      let txnValue = web3.toWei(4, "ether");

      let startBalance = await web3.eth.getBalance(buyerAccount);
      let startCstEth = await web3.eth.getBalance(cst.address);

      startBalance = asInt(startBalance);

      await cst.setCustomBuyer(buyerAccount, 4);

      let txn = await cst.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endBalance = await web3.eth.getBalance(buyerAccount);
      let endCstEth = await web3.eth.getBalance(cst.address);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 160000, "Less than 160000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(web3.fromWei(asInt(endCstEth) - asInt(startCstEth), 'ether'), 4, 'the ether balance for the CST contract is correct');
      assert.equal(cstBalance, 4, "The CST balance is correct");
      assert.equal(totalInCirculation, 4, "The CST total in circulation was updated correctly");
      assert.equal(asInt(balanceOfCstContract), 96, "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value.toNumber(), 4, "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, buyerAccount, "The recipient is correct");
    });

    it("does not allows a buyer to buy enough CST to exceed custom balance limit", async function() {
      let buyerAccount = accounts[1];
      await ledger.mintTokens(100);
      await ledger.debitAccount(buyerAccount, 1);
      await cst.configure(web3.toHex("CardStack Token"),
                          web3.toHex("CST"),
                          web3.toWei(1, "ether"),
                          web3.toWei(1, "ether"),
                          100,
                          10,
                          2,
                          NULL_ADDRESS);
      let txnValue = web3.toWei(4, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      await cst.setCustomBuyer(buyerAccount, 4);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 1, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 1, "The CST total in circulation was not updated");
      assert.equal(asInt(balanceOfCstContract), 99, "The balanceOf the cst contract is correct");
    });

  });
});
