// const {
//   GAS_PRICE,
//   asInt
// } = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");

contract('CardStackToken', function(/*accounts*/) {

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

  describe("mintTokens()", function() {
    xit("can allow the owner to mint tokens", async function() {
    });

    xit("does not allow a non-owner to mint tokens", async function() {
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
