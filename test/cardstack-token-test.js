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

      let isRegistrySuperAdmin = await cst.superAdmins(registry.address);
      let superAdminCount = await cst.totalSuperAdmins();
      let firstSuperAdmin = await cst.superAdminsForIndex(0);

      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(superAdminCount, 1, "the super admin count is correct for the cst contract");
      assert.equal(firstSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");

      await registry.register("CST", cst.address);
      await cst.addSuperAdmin(superAdmin);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.configure(0x0, 0x0, 0, 0, 0, 0, 1000000, accounts[0]);
      await cst.setMinimumBalance(0);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("should configure the CST correctly", async function() {
      await ledger.mintTokens(10000);

      await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000, 8000, 1000000, NULL_ADDRESS);

      let name = await cst.name();
      let symbol = await cst.symbol();
      let totalTokens = await cst.totalSupply();
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

    xit("it should configure CST with the buyer pool and the balance limit (feelfree to merge with test above", async function() {
    });

    it("non-owner cannot configure token", async function() {
      let nonOwner = accounts[1];

      await ledger.mintTokens(10000);

      let exceptionThrown;
      try {
        await cst.configure(web3.toHex("CardStack Token"), web3.toHex("CST"), 2, 1, 8000, 8000, 1000000, NULL_ADDRESS, {
          from: nonOwner
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");
    });

    it("does not allow non-superAdmin to configure using external storage", async function() {
      let nonOwner = accounts[1];

      await ledger.mintTokens(10000);

      await storage.setUIntValue(web3.sha3("cstBuyPrice"), web3.toWei(0.5, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellPrice"), web3.toWei(0.4, "ether"));
      await storage.setUIntValue(web3.sha3("cstSellCap"), 10);
      await storage.setBytes32Value(web3.sha3("cstTokenSymbol"), web3.toHex("CST1"));
      await storage.setBytes32Value(web3.sha3("cstTokenName"), web3.toHex("New CardStack Token"));

      let exceptionThrown;
      try {
        await cst.configureFromStorage({ from: nonOwner });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");
    });

    it("can allow superAdmin to update storage", async function() {
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
      let totalTokens = await cst.totalSupply();
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
      let totalTokens = await cst.totalSupply();
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
      await registry.register("CST", cst.address);
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

      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(asInt(totalTokens), 200, "The totalTokens is correct");
      assert.equal(asInt(balanceOfCstContract), 200, "The balanceOf cst contract is correct");
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

      let totalTokens = await cst.totalSupply();
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
      await registry.register("CST", cst.address);
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

      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let balanceOfCstContract = await cst.balanceOf(cst.address);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 20, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 20, "The recipientBalance is correct");
      assert.equal(asInt(balanceOfCstContract), 80, "The balanceOf the cst contract is correct");

      assert.equal(txn.logs.length, 1, "The correct number of events were fired");

      let event = txn.logs[0];
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(event.args._value, 20, "The CST amount is correct");
      assert.equal(event.args._from, cst.address, "The sender is correct");
      assert.equal(event.args._to, recipientAccount, "The recipient is correct");
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

      let totalTokens = await cst.totalSupply();
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

      let totalTokens = await cst.totalSupply();
      let totalInCirculation = await cst.totalInCirculation();
      let recipientBalance = await cst.balanceOf(recipientAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 0, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 0, "The recipientBalance is correct");
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
      await registry.register("CST", cst.address);
      await cst.addSuperAdmin(superAdmin);
      await cst.mintTokens(1000);
    });

    // be kind and return ethers to the root account
    afterEach(async function() {
      let cstEth = await web3.eth.getBalance(cst.address);

      await cst.configure(0x0, 0x0, 0, 0, 0, 0, 1000000, accounts[0]);
      await cst.setMinimumBalance(0);
      await cst.foundationWithdraw(cstEth.toNumber());
    });

    it("allows foundation to withdraw ether from foundationWithdraw()", async function() {
      let buyer = accounts[20];
      await checkBalance(buyer, 1);
      await cst.configure(0x0, 0x0, web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 1000, 1000, 1000000, foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      await cst.addBuyer(buyer);
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
      await cst.configure(0x0, 0x0, web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 1000, 1000, 1000000, foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      await cst.addBuyer(buyer);
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
      await cst.configure(0x0, 0x0, web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 1000, 1000, 1000000, foundation, { from: superAdmin });

      let txnValue = web3.toWei(1, "ether");
      let minValue = web3.toWei(0.5, "ether");
      await cst.setMinimumBalance(minValue, { from: superAdmin });
      await cst.addBuyer(buyer);
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
      await cst.configure(0x0, 0x0, web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 1000, 1000, 1000000, foundation, { from: superAdmin });

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

  describe("buyer whitelist", function() {
    let approvedBuyer = accounts[11];

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
      await registry.register("CST", cst.address);
      await cst.addSuperAdmin(superAdmin);
      await cst.mintTokens(1000);
    });

    it("allows a super admin to add an approved buyer", async function() {
      let totalBuyers = await cst.totalBuyers();

      assert.equal(totalBuyers.toNumber(), 0, 'the totalBuyers is correct');

      await cst.addBuyer(approvedBuyer, { from: superAdmin });

      totalBuyers = await cst.totalBuyers();
      let isBuyer = await cst.approvedBuyer(approvedBuyer);
      let firstBuyer = await cst.approvedBuyerForIndex(0);

      assert.equal(totalBuyers, 1, 'the totalBuyers is correct');
      assert.ok(isBuyer, "the buyer is set");
      assert.equal(firstBuyer, approvedBuyer, "the approvedBuyerForIndex is correct");
    });

    it("allows a super admin to remove an approved buyer", async function() {
      await cst.addBuyer(approvedBuyer, { from: superAdmin });

      await cst.removeBuyer(approvedBuyer, { from: superAdmin });

      let isBuyer = await cst.approvedBuyer(approvedBuyer);

      assert.notOk(isBuyer, "the buyer is not set");
    });

    it("does not allow a non-super admin to add an approved buyer", async function() {
      let exceptionThrown;
      try {
        await cst.addBuyer(approvedBuyer, { from: approvedBuyer });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalBuyers = await cst.totalBuyers();
      let isBuyer = await cst.approvedBuyer(approvedBuyer);

      assert.equal(totalBuyers.toNumber(), 0, 'the totalBuyers is correct');
      assert.notOk(isBuyer, "the buyer is not set");
    });

    it("does not allow a non-super admin to remove an approved buyer", async function() {
      await cst.addBuyer(approvedBuyer, { from: superAdmin });

      let exceptionThrown;
      try {
        await cst.removeBuyer(approvedBuyer, { from: approvedBuyer });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalBuyers = await cst.totalBuyers();
      let isBuyer = await cst.approvedBuyer(approvedBuyer);

      assert.equal(totalBuyers, 1, 'the totalBuyers is correct');
      assert.ok(isBuyer, "the buyer is set");
    });

  });

  describe("setCustomBuyer", function() {
    xit("should allows super admin to set custom buyer", async function() {
      // assert totalCustomBuyers
      // assert customBuyerForIndex
      // assert customBuyerLimt
      // assert approvedBuyer
    });

    xit("should not allow non-super admin to set custom buyer", async function() {
    });
  });

});
