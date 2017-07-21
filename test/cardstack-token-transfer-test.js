const CardStackToken = artifacts.require("./CardStackToken.sol");
const {
  GAS_PRICE,
  asInt,
  checkBalance
} = require("../lib/utils");

contract('CardStackToken', function(accounts) {

  describe("transfer()", function() {
    let cst;
    let senderAccount = accounts[3];
    let recipientAccount = accounts[4];

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      await checkBalance(senderAccount, 1);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    it("should be able to transfer CST to another account", async function() {
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

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args.value.toString(), "10", "The CST amount is correct");
      assert.equal(event.args.sender, senderAccount, "The sender is correct");
      assert.equal(event.args.senderAccount, senderAccount, "The senderAccount is correct");
      assert.equal(event.args.recipient, recipientAccount, "The recipient is correct");
      assert.equal(event.args.recipientAccount, recipientAccount, "The recipientAccount is correct");
    });

    it("should not be able to transfer more CST than is in the sender's account", async function() {
      let transferAmount = 11;

      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });
  });
});
