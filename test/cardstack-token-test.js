const GAS_PRICE = web3.toWei(20, "gwei");
const ROUNDING_ERROR_WEI = 20000;
const MAX_FAILED_TXN_GAS = 5000000;
let CardStackToken = artifacts.require("./CardStackToken.sol");

// TODO export this from a lib
function asInt(contractValue) {
  if (!contractValue) { throw new Error("Cannot convert to int ", JSON.stringify(contractValue)); }

  return parseInt(contractValue.toString(), 10);
}

contract('CardStackToken', function(accounts) {

  describe("create contract", function() {
    it("should initialize the CST correctly", async function() {
      let cst = await CardStackToken.new(10000, "CardStack Token", "CST", 2, 1, 8000);
      let name = await cst.name();
      let symbol = await cst.symbol();
      let supply = await cst.totalSupply();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(name, "CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST", "The symbol of the token is correct");
      assert.equal(supply, 10000, "The totalSupply is correct");
      assert.equal(sellCap, 8000, "The sellCap is correct");
      assert.equal(totalInCirculation, 0, "The totalInCirculation is correct");
      assert.equal(buyPrice, 2, "The buyPrice is correct");
      assert.equal(sellPrice, 1, "The sellPrice is correct");
    });
  });

  describe("transfer()", function() {
    let cst;
    let senderAccount = accounts[3];
    let recipientAccount = accounts[4];

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      let balanceEth = await web3.eth.getBalance(senderAccount);
      balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

      if (balanceEth < 1) {
        throw new Error(`Not enough ether in address ${senderAccount} to perform test--restart testrpc to top-off balance`);
      }

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
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
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
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });
  });

  describe("sell()", function() {
    let cst;

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      for (let i = 0; i < Math.min(accounts.length, 10); i++) {
        let account = accounts[i];
        let balanceEth = await web3.eth.getBalance(account);
        balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

        if (balanceEth < 1) {
          throw new Error(`Not enough ether in address ${account} to perform test--restart testrpc to top-off balance`);
        }

        await cst.buy({
          from: account,
          value: web3.toWei(1, "ether"),
          gasPrice: GAS_PRICE
        });
      }
    });

    it("should be able to sell CST", async function() {
      let sellerAccount = accounts[2];
      let startWalletBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 10;
      startWalletBalance = asInt(startWalletBalance);

      let txn = await cst.sell(sellAmount, {
        from: sellerAccount,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let { cumulativeGasUsed } = txn.receipt;
      let endWalletBalance = await web3.eth.getBalance(sellerAccount);
      let endCstBalance = await cst.balanceOf(sellerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endWalletBalance = asInt(endWalletBalance);

      assert.ok(cumulativeGasUsed < 50000, "Less than 50000 gas was used for the txn");
      assert.ok(Math.abs(startWalletBalance + (sellAmount * web3.toWei(0.1, "ether")) - (GAS_PRICE * cumulativeGasUsed) - endWalletBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet credited correctly");
      assert.equal(asInt(endCstBalance), 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was updated correctly");
      assert.equal(asInt(totalInCirculation), 90, "The CST total in circulation was updated correctly");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Sell", "The event type is correct");
      assert.equal(event.args.sellPrice.toString(), (sellAmount * web3.toWei(0.1, "ether")), "The sell price is correct");
      assert.equal(event.args.value.toString(), "10", "The CST amount is correct");
      assert.equal(event.args.seller, sellerAccount, "The CST seller is correct");
      assert.equal(event.args.sellerAccount, sellerAccount, "The CST seller account is correct");
    });

    it("should not be able to sell more CST than in sellers account", async function() {
      let sellerAccount = accounts[2];
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 11;
      startBalance = asInt(startBalance);

      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The seller's account was changed for just gas");
      assert.equal(cstBalance, 10, "The CST balance is correct");
      assert.equal(asInt(supply), 0, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 100, "The CST total in circulation was not updated");
    });
  });

  describe("buy()", function() {
    beforeEach(async function() {
      for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i];
        let balanceEth = await web3.eth.getBalance(account);
        balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

        if (balanceEth < 1) {
          throw new Error(`Not enough ether in address ${account} to perform test--restart testrpc to top-off balance`);
        }
      }
    });

    it("should be able to purchase CST", async function() {
      let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

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
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(cumulativeGasUsed < 70000, "Less than 70000 gas was used for the txn");
      assert.ok(Math.abs(startBalance - asInt(txnValue) - (GAS_PRICE * cumulativeGasUsed) - endBalance) < ROUNDING_ERROR_WEI, "Buyer's wallet debited correctly");
      assert.equal(cstBalance, 2, "The CST balance is correct");
      assert.equal(supply, 8, "The CST total supply was updated correctly");
      assert.equal(totalInCirculation, 2, "The CST total in circulation was updated correctly");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Buy", "The event type is correct");
      assert.equal(event.args.purchasePrice.toString(), txnValue, "The purchase price is correct");
      assert.equal(event.args.value.toString(), "2", "The CST amount is correct");
      assert.equal(event.args.buyer, buyerAccount, "The CST buyer is correct");
      assert.equal(event.args.buyerAccount, buyerAccount, "The CST buyerAccount is correct");
    });

    it("can not purchase more CST than the amount of ethers in the buyers wallet", async function() {
      let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 10);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(1000, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      if (asInt(txnValue) < asInt(startBalance)) {
        throw new Error(`Buyer account ${buyerAccount} has too much value to be able to conduct this test ${startBalance}`);
      }

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than has been minted", async function() {
      let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(11, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase fractional CST (less than purchase price for a single CST)", async function() {
      let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 15);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(0.9, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });

    it("can not purchase more CST than the CST sellCap", async function() {
      let cst = await CardStackToken.new(10, "CardStack Token", "CST", web3.toWei(1, "ether"), web3.toWei(1, "ether"), 5);
      let buyerAccount = accounts[1];
      let txnValue = web3.toWei(6, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(supply), 10, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
    });
  });

  describe("frozen account", function() {
    let cst;
    let frozenAccount = accounts[5];

    beforeEach(async function() {
      cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);

      let balanceEth = await web3.eth.getBalance(frozenAccount);
      balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

      if (balanceEth < 1) {
        throw new Error(`Not enough ether in address ${frozenAccount} to perform test--restart testrpc to top-off balance`);
      }

      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      await cst.freezeAccount(frozenAccount, true);
    });

    it("cannot sell CST when frozen", async function() {
      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
      startBalance = asInt(startBalance);

      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot buy CST when frozen", async function() {
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply was not updated");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

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
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;
      let balanceEth = await web3.eth.getBalance(senderAccount);
      balanceEth = parseInt(web3.fromWei(balanceEth.toString(), 'ether'), 10);

      if (balanceEth < 1) {
        throw new Error(`Not enough ether in address ${senderAccount} to perform test--restart testrpc to top-off balance`);
      }

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

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
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 80, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("can unfreeze an account", async function() {
      await cst.freezeAccount(frozenAccount, false);

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
      let supply = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(supply), 90, "The CST total supply has not changed");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    xit("cannot receive CST reward when frozen", async function() {
    });
  });

});
