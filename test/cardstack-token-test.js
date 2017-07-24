const {
  // GAS_PRICE,
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

      await cst.mintTokens(100, {
        from: ownerAccount
      });

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });

    it("does not allow a non-owner to mint tokens", async function() {
      let cst = await CardStackToken.new(100, "CardStack Token", "CST", web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      let nonOwnerAccount = accounts[9];

      try {
        await cst.mintTokens(100, {
          from: nonOwnerAccount
        });
        assert.ok(false, "Transaction should fire exception");
      } catch(err) {
        // expect exception to be fired
      }

      let totalTokens = await cst.totalTokens();
      let sellCap = await cst.sellCap();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });
  });

  describe("grantTokens()", function() {
    xit("can allow the owner to grant tokens", async function() {
    });

    xit("does not allow a non-owner to grant tokens", async function() {
    });
  });

  describe("setPrices()", function() {
    xit("can allow the owner to set buy and sell prices", async function() {
    });

    xit("does not allow a non-owner to set buy and sell prices", async function() {
    });
  });

  describe("cstAvailableToBuy()", function() {
    xit("indicates that cst are not available to buy when CST sold reaches the sell cap", async function() {
    });
    xit("indicates that cst are available to buy when CST sold has not reached the sell cap", async function() {
    });
  });

  describe("setCstSellCap()", function() {
    xit("can allow the owner to set sell cap", async function() {
    });

    xit("does not allow a non-owner to set sell cap", async function() {
    });
  });

});
