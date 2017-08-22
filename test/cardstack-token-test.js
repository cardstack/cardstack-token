const {
  GAS_PRICE,
  MAX_FAILED_TXN_GAS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('CardStackToken', function(accounts) {
  let ledger;
  let storage;

  describe("create contract", function() {
    it("should initialize the CST correctly", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000);

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

      let storageTokenName = await storage.getBytes32Value(web3.sha3("cstTokenName"));
      let storageTokenSymbol = await storage.getBytes32Value(web3.sha3("cstTokenSymbol"));
      let storageBuyPrice = await storage.getUIntValue(web3.sha3("cstBuyPrice"));
      let storageSellPrice = await storage.getUIntValue(web3.sha3("cstSellPrice"));
      let storageSellCap = await storage.getUIntValue(web3.sha3("cstSellCap"));

      assert.equal(web3.toUtf8(storageTokenName.toString()), "CardStack Token", "external storage is updated");
      assert.equal(web3.toUtf8(storageTokenSymbol.toString()), "CST", "external storage is updated");
      assert.equal(storageBuyPrice.toNumber(), 2, "external storage is updated");
      assert.equal(storageSellPrice.toNumber(), 1, "external storage is updated");
      assert.equal(storageSellCap.toNumber(), 8000, "external storage is updated");
    });

    xit("should not be able to be created with null storage address", async function() {
    });

    xit("should not be able to be created with null ledger address", async function() {
    });

    it("freezes the token before it has been initialized", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let buyer = accounts[4];

      await checkBalance(buyer);

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await storage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(1, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(1, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellCap"), 10);

      let txnValue = web3.toWei(2, "ether");
      let startBalance = await web3.eth.getBalance(buyer);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyer,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }

      let endBalance = await web3.eth.getBalance(buyer);
      let cstBalance = await cst.balanceOf(buyer);
      let totalInCirculation = await cst.totalInCirculation();
      let tokenFrozen = await cst.frozenToken();

      assert.ok(exceptionThrown, "Transaction should fire exception");

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("non-owner cannot initialize token", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let nonOwner = accounts[1];

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      let exceptionThrown;
      try {
        await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000, {
          from: nonOwner
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let tokenFrozen = await cst.frozenToken();

      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("can allow owner to initialize using the external storage", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await storage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(0.5, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(0.4, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellCap"), 10);
      await storage.setBytes32Value(web3.sha3("cstTokenSymbol"), web3.toHex("CST1"));
      await storage.setBytes32Value(web3.sha3("cstTokenName"), web3.toHex("New CardStack Token"));

      await cst.initializeFromStorage();

      let name = await cst.name();
      let symbol = await cst.symbol();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();
      let tokenFrozen = await cst.frozenToken();

      assert.equal(name, "New CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST1", "The symbol of the token is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.5, "ether"), "The buyPrice is correct");
      assert.equal(asInt(sellPrice), web3.toWei(0.4, "ether"), "The sellPrice is correct");
      assert.notOk(tokenFrozen, "token is not frozen");
    });

    it("does not allow non-owner to initialize using external storage", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let nonOwner = accounts[1];

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await storage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(0.5, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(0.4, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellCap"), 10);
      await storage.setBytes32Value(web3.sha3("cstTokenSymbol"), web3.toHex("CST1"));
      await storage.setBytes32Value(web3.sha3("cstTokenName"), web3.toHex("New CardStack Token"));

      let exceptionThrown;
      try {
        await cst.initializeFromStorage({ from: nonOwner });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let tokenFrozen = await cst.frozenToken();

      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("can allow owner to update storage address", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let newStorage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await newStorage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await newStorage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(0.5, "ether"));
      await newStorage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(0.4, "ether"));
      await newStorage.setUIntValue(web3.sha3("cstSellCap"), 10);
      await newStorage.setBytes32Value(web3.sha3("cstTokenSymbol"), web3.toHex("CST1"));
      await newStorage.setBytes32Value(web3.sha3("cstTokenName"), web3.toHex("New CardStack Token"));

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000);
      await cst.updateExternalStorage(newStorage.address);

      let name = await cst.name();
      let symbol = await cst.symbol();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();

      assert.equal(name, "New CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST1", "The symbol of the token is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.5, "ether"), "The buyPrice is correct");
      assert.equal(asInt(sellPrice), web3.toWei(0.4, "ether"), "The sellPrice is correct");
    });

    it("can allow owner to update ledger address", async function() {
      let tokenHolder = accounts[6];
      let newLedger = await CstLedger.new();
      ledger = await CstLedger.new();
      storage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await newLedger.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await newLedger.mintTokens(200);
      await newLedger.debitAccount(tokenHolder, 100);

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000);
      await cst.updateLedgerStorage(newLedger.address);

      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let balance = await cst.balanceOf(tokenHolder);

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 100, "The totalInCirculation is correct");
      assert.equal(asInt(balance), 100, "The balance is correct");
    });

    it("non-owner cannot not update storage address", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let nonOwner = accounts[2];
      let newStorage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await newStorage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await newStorage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(0.5, "ether"));
      await newStorage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(0.4, "ether"));
      await newStorage.setUIntValue(web3.sha3("cstSellCap"), 10);
      await newStorage.setBytes32Value(web3.sha3("cstTokenSymbol"), web3.toHex("CST1"));
      await newStorage.setBytes32Value(web3.sha3("cstTokenName"), web3.toHex("New CardStack Token"));

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000);

      let exceptionThrown;
      try {
        await cst.updateExternalStorage(newStorage.address, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");

      let name = await cst.name();
      let symbol = await cst.symbol();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();

      assert.equal(name, "CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST", "The symbol of the token is correct");
      assert.equal(asInt(sellCap), 8000, "The sellCap is correct");
      assert.equal(asInt(buyPrice), 2, "The buyPrice is correct");
      assert.equal(asInt(sellPrice), 1, "The sellPrice is correct");
    });

    it("non-owner cannot update ledger address", async function() {
      let tokenHolder = accounts[6];
      let newLedger = await CstLedger.new();
      let nonOwner = accounts[2];
      ledger = await CstLedger.new();
      storage = await Storage.new();

      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await newLedger.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(10000);

      await newLedger.mintTokens(200);
      await newLedger.debitAccount(tokenHolder, 100);

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000);

      let exceptionThrown;
      try {
        await cst.updateLedgerStorage(newLedger.address, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");

      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let balance = await cst.balanceOf(tokenHolder);

      assert.equal(asInt(totalTokens), 10000, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(balance), 0, "The balance is correct");
    });
  });

  describe("mintTokens()", function() {
    it("can allow the owner to mint tokens", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let txn = await cst.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"), {
        from: ownerAccount
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();
      let storageBuyPrice = await storage.getUIntValue(web3.sha3("cstBuyPrice"));
      let storageSellPrice = await storage.getUIntValue(web3.sha3("cstSellPrice"));

      assert.equal(asInt(sellPrice), web3.toWei(2, "ether"), "The sellPrice is correct");
      assert.equal(asInt(buyPrice), web3.toWei(1, "ether"), "The buyPrice is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "PriceChange", "The event type is correct");
      assert.equal(asInt(event.args.newSellPrice), web3.toWei(2, "ether"), "The sell price is correct");
      assert.equal(asInt(event.args.newBuyPrice), web3.toWei(1, "ether"), "The buy price is correct");

      assert.equal(storageBuyPrice.toNumber(), web3.toWei(1, "ether"), "external storage is updated");
      assert.equal(storageSellPrice.toNumber(), web3.toWei(2, "ether"), "external storage is updated");
    });

    it("cannot set the buyPrice to 0", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
      let ownerAccount = accounts[0];

      let txn = await cst.setSellCap(20, {
        from: ownerAccount
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellCap = await cst.sellCap();
      let storageSellCap = await storage.getUIntValue(web3.sha3("cstSellCap"));

      assert.equal(asInt(sellCap), 20, "The sellCap is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "SellCapChange", "The event type is correct");
      assert.equal(asInt(event.args.newSellCap), 20, "The sell price is correct");

      assert.equal(storageSellCap.toNumber(), 20, "external storage is updated");
    });

    it("does not allow a non-owner to set sell cap", async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      let cst = await CardStackToken.new(ledger.address, storage.address);
      await storage.addAdmin(cst.address);
      await ledger.addAdmin(cst.address);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 10);
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
