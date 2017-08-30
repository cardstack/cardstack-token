const {
  GAS_PRICE,
  MAX_FAILED_TXN_GAS,
  ROUNDING_ERROR_WEI,
  NULL_ADDRESS,
  asInt,
  checkBalance
} = require("../lib/utils");

const Registry = artifacts.require("./Registry.sol");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('CardStackToken', function(accounts) {
  let ledger;
  let storage;
  let registry;
  let cst;
  let superAdmin = accounts[42];

  describe("create contract", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"));
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"));
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 100);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, true);
      await cst.addSuperAdmin(superAdmin);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.setFoundation(accounts[0]);
      await cst.setMinimumBalance(0);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("should initialize the CST correctly", async function() {
      await ledger.mintTokens(10000);

      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000, NULL_ADDRESS);

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

      let storageTokenName = await storage.getBytes32Value("cstTokenName");
      let storageTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice");
      let storageSellPrice = await storage.getUIntValue("cstSellPrice");
      let storageSellCap = await storage.getUIntValue("cstSellCap");

      assert.equal(web3.toUtf8(storageTokenName.toString()), "CardStack Token", "external storage is updated");
      assert.equal(web3.toUtf8(storageTokenSymbol.toString()), "CST", "external storage is updated");
      assert.equal(storageBuyPrice.toNumber(), 2, "external storage is updated");
      assert.equal(storageSellPrice.toNumber(), 1, "external storage is updated");
      assert.equal(storageSellCap.toNumber(), 8000, "external storage is updated");
    });

    it("freezes the token before it has been initialized when registered and paused", async function() {
      let buyer = accounts[4];

      await checkBalance(buyer, 2);

      await ledger.mintTokens(10000);

      await storage.setUIntValue("cstBuyPrice", web3.toWei(1, "ether"));
      await storage.setUIntValue("cstSellPrice", web3.toWei(1, "ether"));
      await storage.setUIntValue("cstSellCap", 10);

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
      let cstBalance = await ledger.balanceOf(buyer);
      let totalInCirculation = await ledger.totalInCirculation();
      let tokenFrozen = await cst.frozenToken();

      assert.ok(exceptionThrown, "Transaction should fire exception");

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("non-owner cannot initialize token", async function() {
      let nonOwner = accounts[1];

      await ledger.mintTokens(10000);

      let exceptionThrown;
      try {
        await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000, NULL_ADDRESS, {
          from: nonOwner
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let tokenFrozen = await cst.frozenToken();

      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("the token remains frozen after its been initialized from storage", async function() {
      let buyer = accounts[4];

      await checkBalance(buyer, 2);

      await ledger.mintTokens(10000);

      await cst.initializeFromStorage();

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
      let cstBalance = await ledger.balanceOf(buyer);
      let totalInCirculation = await ledger.totalInCirculation();
      let tokenFrozen = await cst.frozenToken();

      assert.ok(exceptionThrown, "Transaction should fire exception");

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(cstBalance, 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 0, "The CST total in circulation was not updated");
      assert.ok(tokenFrozen, "token is still frozen");
    });

    it("can allow superAdmin to start the token after initialize using the external storage", async function() {
      await ledger.mintTokens(10000);

      await storage.setUIntValue("cstBuyPrice", web3.toWei(0.5, "ether"));
      await storage.setUIntValue("cstSellPrice", web3.toWei(0.4, "ether"));
      await storage.setUIntValue("cstSellCap", 10);
      await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST1"));
      await storage.setBytes32Value("cstTokenName", web3.toHex("New CardStack Token"));

      await cst.initializeFromStorage({ from: superAdmin });
      await cst.start({ from: superAdmin });

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

    it("does not allow non-superAdmin to initialize using external storage", async function() {
      let nonOwner = accounts[1];

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

    it("can allow superAdmin to update storage", async function() {
      await cst.start();

      let tokenHolder = accounts[6];
      let newStorage = await Storage.new();
      let newLedger = await CstLedger.new();

      await ledger.mintTokens(10000);

      await newStorage.setUIntValue("cstBuyPrice", web3.toWei(0.5, "ether"));
      await newStorage.setUIntValue("cstSellPrice", web3.toWei(0.4, "ether"));
      await newStorage.setUIntValue("cstSellCap", 10);
      await newStorage.setBytes32Value("cstTokenSymbol", web3.toHex("CST1"));
      await newStorage.setBytes32Value("cstTokenName", web3.toHex("New CardStack Token"));
      await newLedger.mintTokens(200);
      await newLedger.debitAccount(tokenHolder, 100);

      await registry.addStorage("newStorage", newStorage.address);
      await registry.addStorage("newLedger", newLedger.address);
      await newStorage.addSuperAdmin(registry.address);
      await newLedger.addSuperAdmin(registry.address);
      await newStorage.addAdmin(cst.address);
      await newLedger.addAdmin(cst.address);

      await cst.updateStorage("newStorage", "newLedger", { from: superAdmin });

      let name = await cst.name();
      let symbol = await cst.symbol();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();
      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let balance = await cst.balanceOf(tokenHolder);

      assert.equal(name, "New CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST1", "The symbol of the token is correct");
      assert.equal(asInt(sellCap), 10, "The sellCap is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.5, "ether"), "The buyPrice is correct");
      assert.equal(asInt(sellPrice), web3.toWei(0.4, "ether"), "The sellPrice is correct");
      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 100, "The totalInCirculation is correct");
      assert.equal(asInt(balance), 100, "The balance is correct");
    });

    it("non-superAdmin cannot not update storage", async function() {
      await cst.start();
      let nonOwner = accounts[9];
      let tokenHolder = accounts[6];

      let newStorage = await Storage.new();
      let newLedger = await CstLedger.new();

      await ledger.mintTokens(10000);

      await newStorage.setUIntValue("cstBuyPrice", web3.toWei(0.5, "ether"));
      await newStorage.setUIntValue("cstSellPrice", web3.toWei(0.4, "ether"));
      await newStorage.setUIntValue("cstSellCap", 10);
      await newStorage.setBytes32Value("cstTokenSymbol", web3.toHex("CST1"));
      await newStorage.setBytes32Value("cstTokenName", web3.toHex("New CardStack Token"));
      await newLedger.mintTokens(200);
      await newLedger.debitAccount(tokenHolder, 100);

      await registry.addStorage("newStorage", newStorage.address);
      await registry.addStorage("newLedger", newLedger.address);
      await newStorage.addSuperAdmin(registry.address);
      await newLedger.addSuperAdmin(registry.address);
      await newStorage.addAdmin(cst.address);
      await newLedger.addAdmin(cst.address);

      let exceptionThrown;
      try {
        await cst.updateStorage("newStorage", "newLedger", { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Expected exception to be thrown");

      let name = await cst.name();
      let symbol = await cst.symbol();
      let buyPrice = await cst.buyPrice();
      let sellPrice = await cst.sellPrice();
      let sellCap = await cst.sellCap();
      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let balance = await cst.balanceOf(tokenHolder);

      assert.equal(name, "CardStack Token", "The name of the token is correct");
      assert.equal(symbol, "CST", "The symbol of the token is correct");
      assert.equal(asInt(sellCap), 100, "The sellCap is correct");
      assert.equal(asInt(buyPrice), web3.toWei(0.1, 'ether'), "The buyPrice is correct");
      assert.equal(asInt(sellPrice), web3.toWei(0.1, 'ether'), "The sellPrice is correct");

      assert.equal(asInt(totalTokens), 10000, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(balance), 0, "The balance is correct");
    });
  });

  describe("mintTokens()", function() {
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
      await cst.addSuperAdmin(superAdmin);
    });

    it("can allow the superAdmin to mint tokens", async function() {
      await ledger.mintTokens(100);

      let txn = await cst.mintTokens(100, {
        from: superAdmin
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Mint", "The event type is correct");
      assert.equal(asInt(event.args.amountMinted), 100, "The amount minted is correct");
      assert.equal(asInt(event.args.totalTokens), 200, "The total tokens is correct");
    });

    it("does not allow a non-owner to mint tokens", async function() {
      await ledger.mintTokens(100);
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
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
    });
  });

  describe("grantTokens()", function() {
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
      await cst.addSuperAdmin(superAdmin);
    });

    it("can allow the superAdmin to grant tokens", async function() {
      await ledger.mintTokens(100);
      let recipientAccount = accounts[9];

      let txn = await cst.grantTokens(recipientAccount, 20, {
        from: superAdmin
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
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
      await ledger.mintTokens(100);
      let recipientAccount = accounts[9];

      let exceptionThrown;
      try {
        await cst.grantTokens(recipientAccount, 101, {
          from: superAdmin
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await cst.totalTokens();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });

    it("does not allow a non-superAdmin to grant tokens", async function() {
      await ledger.mintTokens(100);
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
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
    });
  });

  describe("setPrices()", function() {
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"));
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"));
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 100);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
      await cst.addSuperAdmin(superAdmin);
    });

    it("can allow the superAdmin to set buy and sell prices", async function() {
      await ledger.mintTokens(100);

      let txn = await cst.setPrices(web3.toWei(2, "ether"), web3.toWei(1, "ether"), {
        from: superAdmin
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellPrice = await cst.sellPrice();
      let buyPrice = await cst.buyPrice();
      let storageBuyPrice = await storage.getUIntValue("cstBuyPrice");
      let storageSellPrice = await storage.getUIntValue("cstSellPrice");

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
      await ledger.mintTokens(100);

      let exceptionThrown;
      try {
        await cst.setPrices(web3.toWei(2, "ether"), 0, {
          from: superAdmin
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
      await ledger.mintTokens(100);

      let exceptionThrown;
      try {
        await cst.setPrices(0, web3.toWei(2, "ether"), {
          from: superAdmin
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

    it("does not allow a non-superAdmin to set buy and sell prices", async function() {
      await ledger.mintTokens(100);
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
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"));
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"));
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 10);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.setFoundation(accounts[0]);
      await cst.setMinimumBalance(0);
      await cst.foundationWithdraw(cstEth.toNumber());
    });


    it("indicates that cst are not available to buy when CST sold reaches the sell cap", async function() {
      await ledger.mintTokens(100);
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
      await ledger.mintTokens(100);
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
    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"));
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"));
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 10);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
      await cst.addSuperAdmin(superAdmin);
    });

    it("can allow the superAdmin to set sell cap", async function() {
      await ledger.mintTokens(100);

      let txn = await cst.setSellCap(20, {
        from: superAdmin
      });

      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let sellCap = await cst.sellCap();
      let storageSellCap = await storage.getUIntValue("cstSellCap");

      assert.equal(asInt(sellCap), 20, "The sellCap is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "SellCapChange", "The event type is correct");
      assert.equal(asInt(event.args.newSellCap), 20, "The sell price is correct");

      assert.equal(storageSellCap.toNumber(), 20, "external storage is updated");
    });

    it("does not allow a non-superAdmin to set sell cap", async function() {
      await ledger.mintTokens(100);
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

  describe("foundation", function() {
    let foundation = accounts[11];

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"));
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"));
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"));
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 1000);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);
      await cst.addSuperAdmin(superAdmin);
      await cst.mintTokens(1000);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.setFoundation(accounts[0]);
      await cst.setMinimumBalance(0);
      await cst.foundationWithdraw(cstEth.toNumber());
    });


    it("allows superAdmin to add foundation address", async function() {
      await cst.setFoundation(foundation, { from: superAdmin });

      let observedFoundation = await cst.foundation();

      assert.equal(observedFoundation, foundation, "the foundation address is set");
    });

    it("does not allow non-superAdmin to add foundation address", async function() {
      let nonSuperAdmin = accounts[2];
      let exceptionThrown;
      try {
        await cst.setFoundation(foundation, {
          from: nonSuperAdmin
        });
      } catch(err) {
        exceptionThrown = true;
      }
      let observedFoundation = await cst.foundation();

      assert.ok(exceptionThrown, "Transaction should fire exception");
      assert.equal(observedFoundation, NULL_ADDRESS, "the foundation is not set");
    });

    it("allows foundation to withdraw ether from foundationWithdraw()", async function() {
      let buyer = accounts[20];
      await checkBalance(buyer, 1);
      await cst.setFoundation(foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      await cst.buy({
        from: buyer,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      let txn = await cst.foundationWithdraw(txnValue, {
        from: foundation,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));

      let { cumulativeGasUsed } = txn.receipt;
      let endCstBalance = await web3.eth.getBalance(cst.address);
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

    it("does not allow non-foundation to withdraw ether from foundationWithdraw()", async function() {
      let buyer = accounts[20];
      let nonFoundation = accounts[21];
      await checkBalance(buyer, 1);
      await cst.setFoundation(foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      await cst.buy({
        from: buyer,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let startNonFoundationBalance = await web3.eth.getBalance(nonFoundation);
      startNonFoundationBalance = asInt(startNonFoundationBalance);

      let exceptionThrown;
      try {
        await cst.foundationWithdraw(txnValue, {
          from: nonFoundation,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endCstBalance = await web3.eth.getBalance(cst.address);
      let endNonFoundationBalance = await web3.eth.getBalance(nonFoundation);
      endCstBalance = asInt(endCstBalance);
      endNonFoundationBalance = asInt(endNonFoundationBalance);

      assert.ok(startNonFoundationBalance - endNonFoundationBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The non foundation account was changed for just gas");
      assert.equal(endCstBalance, txnValue, "The CST balance is correct");
    });

    it("does not allow foundation to withdraw more ether than minimumBalance amount", async function() {
      let buyer = accounts[20];
      await checkBalance(buyer, 1);
      await cst.setFoundation(foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      let minValue = web3.toWei(0.5, "ether");
      await cst.setMinimumBalance(minValue, { from: superAdmin });
      await cst.buy({
        from: buyer,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      let exceptionThrown;
      try {
        await cst.foundationWithdraw(txnValue, {
          from: foundation,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endCstBalance = await web3.eth.getBalance(cst.address);
      let endFoundationBalance = await web3.eth.getBalance(foundation);
      endCstBalance = asInt(endCstBalance);
      endFoundationBalance = asInt(endFoundationBalance);

      assert.ok(startFoundationBalance - endFoundationBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The foundation account was changed for just gas");
      assert.equal(endCstBalance, txnValue, "The CST balance is correct");
    });

    it("allows foundation to deposit ether in foundationDeposit", async function() {
      await cst.setFoundation(foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      let startFoundationBalance = await web3.eth.getBalance(foundation);
      startFoundationBalance = asInt(startFoundationBalance);

      let txn = await cst.foundationDeposit({
        from: foundation,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let { cumulativeGasUsed } = txn.receipt;
      let endCstBalance = await web3.eth.getBalance(cst.address);
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
    });

    it("does not allow non-super admin to set minimumBalance", async function() {
      let nonSuperAdmin = accounts[4];
      let minValue = web3.toWei(0.5, "ether");
      let exceptionThrown;
      try {
        await cst.setMinimumBalance(minValue, { from: nonSuperAdmin });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Transaction should fire exception");
      let minimumBalance = await cst.minimumBalance();

      assert.equal(minimumBalance.toNumber(), 0, "The minimumBalance is correct");
    });

  });

});
