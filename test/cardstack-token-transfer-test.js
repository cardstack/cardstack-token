const TestingCardstackToken = artifacts.require("./TestingCardstackToken.sol");
const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const TestingRegistry = artifacts.require("./TestingRegistry.sol");
const { proxyContract } = require('./utils');
const {
  GAS_PRICE,
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
  checkBalance
} = require("../lib/utils");

const MAX_TRANSFER_GAS = 50000;

contract('CardstackToken', function(accounts) {
  let proxyAdmin = accounts[41];

  describe("transfer()", function() {
    let cst;
    let ledger;
    let storage;
    let registry;
    let senderAccount = accounts[3];
    let recipientAccount = accounts[4];

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
      await ledger.mintTokens(web3.toWei(100, 'ether'));
      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 10, web3.toWei(100, 'ether'), web3.toWei(1000000, 'ether'), NULL_ADDRESS);

      await checkBalance(senderAccount, 1);
      await cst.addBuyer(senderAccount);
      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.freezeToken(true);
      await cst.configure(0x0, 0x0, 0, 0, 1000000, accounts[0]);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("should be able to transfer CST to another account", async function() {
      let transferAmount = web3.toWei(10, 'ether');

      let txn = await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(senderBalance.toNumber(), 0, "The CST balance is correct");
      assert.equal(recipientBalance, web3.toWei(10, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(10, 'ether'), "The CST total in circulation has not changed");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(txn.receipt.gasUsed < MAX_TRANSFER_GAS, true, `The transfer txn uses less than ${MAX_TRANSFER_GAS} gas`);
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value, web3.toWei(10, 'ether'), "The CST amount is correct");
      assert.equal(event.args._from, senderAccount, "The sender is correct");
      assert.equal(event.args._to, recipientAccount, "The recipient is correct");
    });

    it("should not be able to transfer more CST than is in the sender's account", async function() {
      let transferAmount = web3.toWei(11, 'ether');

      await assertRevert(async () => await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount
      }));

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(senderBalance, web3.toWei(10, 'ether'), "The CST balance is correct");
      assert.equal(recipientBalance.toNumber(), 0, "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(10, 'ether'), "The CST total in circulation has not changed");
    });

    it("should be able to transfer 0 CST ", async function() {
      let transferAmount = 0;

      await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount
      });

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(senderBalance, web3.toWei(10, 'ether'), "The CST balance is correct");
      assert.equal(recipientBalance.toNumber(), 0, "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(10, 'ether'), "The CST total in circulation has not changed");
    });
  });
});
