const {
  GAS_PRICE,
  asInt
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(accounts) {

  describe("create contract", function() {
    it("should initialize the CST correctly", async function() {
      let cst = await CardStackToken.new(10000, "CardStack Token", "CST", 2, 1, 8000);
      let name = await cst.name();
      let symbol = await cst.symbol();
      let totalTokens = await cst.totalTokens();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(name, "CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST", "The symbol of the token is correct");
      assert.equal(asInt(totalTokens), 10000, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 8000, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(buyPrice), 2, "The buyPrice is correct");
      assert.equal(asInt(sellPrice), 1, "The sellPrice is correct");
    });
  });

  describe("mintTokens()", function() {
    it("can allow the owner to mint tokens", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      let ownerAccount = accounts[0];

      let txn = await cst.mintTokens(100, {
        from: ownerAccount
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Mint", "The event type is correct");
      assert.equal(asInt(event.args.amountMinted), 100, "The amount minted is correct");
      assert.equal(asInt(event.args.totalTokens), 200, "The total tokens is correct");
      assert.equal(asInt(event.args.sellCap), 100, "The sell cap is correct");
    });

    it("does not allow a non-owner to mint tokens", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      let nonOwnerAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst.mintTokens(100, {
          from: nonOwnerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });
  });

  describe("grantTokens()", function() {
    it("can allow the owner to grant tokens", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];
      let recipientAccount = accounts[9];

      let txn = await cst.grantTokens(recipientAccount, 20, {
        from: ownerAccount
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 20, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 20, "The recipientBalance is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Grant", "The event type is correct");
      assert.equal(event.args.recipient, recipientAccount, "The recipient is correct");
      assert.equal(event.args.recipientAccount, recipientAccount, "The recipientAccount is correct");
      assert.equal(asInt(event.args.value), 20, "The amount granted is correct");
    });

    it("cannot grant more tokens than exist", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];
      let recipientAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst.grantTokens(recipientAccount, 101, {
          from: ownerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });

    it("does not allow a non-owner to grant tokens", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let recipientAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst.grantTokens(recipientAccount, 10, {
          from: recipientAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });
  });

  describe("setPrices()", function() {
    it("can allow the owner to set buy and sell prices", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let txn = await cst.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"), {
        from: ownerAccount
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();

      assert.equal(asInt(sellPrice), web3.toWei(2, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(1, "ether"), "The buyPrice is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "PriceChange", "The event type is correct");
      assert.equal(asInt(event.args.newSellPrice), web3.toWei(2, "ether"), "The sell price is correct");
      assert.equal(asInt(event.args.newBuyPrice), web3.toWei(1, "ether"), "The buy price is correct");
    });

    it("cannot set the buyPrice to 0", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let exceptionThrown;
      try {
        await cst.setPrices(web3.toWei(2, "ether"), 0, {
          from: ownerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();

      assert.equal(asInt(sellPrice), web3.toWei(0.1, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, "ether"), "The buyPrice is correct");
    });

    it("cannot set the sellPrice to 0", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let exceptionThrown;
      try {
        await cst.setPrices(0, web3.toWei(2, "ether"), {
          from: ownerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();

      assert.equal(asInt(sellPrice), web3.toWei(0.1, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, "ether"), "The buyPrice is correct");
    });

    // this prevents the CST from becoming insolvent
    xit("cannot set sellPrice higher than amount it would cost for CST contract to buy back all CST", async function() {
    });

    it("does not allow a non-owner to set buy and sell prices", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let nonOwnerAccount = accounts[5];

      let exceptionThrown;
      try {
        await cst.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"), {
          from: nonOwnerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();

      assert.equal(asInt(sellPrice), web3.toWei(0.1, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, "ether"), "The buyPrice is correct");
    });
  });

  describe("cstAvailableToBuy()", function() {
    it("indicates that cst are not available to buy when CST sold reaches the sell cap", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let nonOwnerAccount = accounts[2];

      await cst.buy({
        from: nonOwnerAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let availableToBuy = await cst.cstAvailableToBuy();

      assert.equal(availableToBuy, false, 'CST are not available to buy');
    });

    it("indicates that cst are available to buy when CST sold has not reached the sell cap", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let nonOwnerAccount = accounts[2];

      await cst.buy({
        from: nonOwnerAccount,
        value: web3.toWei(0.5, "ether"),
        gasPrice: GAS_PRICE
      });

      let availableToBuy = await cst.cstAvailableToBuy();

      assert.equal(availableToBuy, true, 'CST are not available to buy');
    });
  });

  describe("setCstSellCap()", function() {
    it("can allow the owner to set sell cap", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let txn = await cst.setSellCap(20, {
        from: ownerAccount
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellCap = await cst.sellCap();

      assert.equal(asInt(sellCap), 20, "The sellCap is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "SellCapChange", "The event type is correct");
      assert.equal(asInt(event.args.newSellCap), 20, "The sell price is correct");
    });

    it("does not allow a non-owner to set sell cap", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let nonOwnerAccount = accounts[5];

      let exceptionThrown;
      try {
        await cst.setsellcap(20, {
          from: nonOwnerAccount
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let sellCap = await cst.sellCap();

      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
    });
  });

});
