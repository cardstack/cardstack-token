const {
  NULL_ADDRESS,
  GAS_PRICE,
  asInt
} = require("../lib/utils");
const Registry = artifacts.require("./Registry.sol");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('Registry', function(accounts) {
  describe("register contract", function() {
    let registry;
    let cst1;
    let cst2;
    let superAdmin = accounts[19];
    let foundation = accounts[31];

    beforeEach(async function() {
      let ledger = await CstLedger.new();
      let storage = await Storage.new();
      registry = await Registry.new();
      await registry.addSuperAdmin(superAdmin);
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);

      await registry.setStorageBytes32Value("cstStorage", "cstTokenName", web3.toHex("CardStack Token"), { from: superAdmin });
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("CST"), { from: superAdmin });
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.1, "ether"), { from: superAdmin });
      await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.1, "ether"), { from: superAdmin });
      await registry.setStorageUIntValue("cstStorage", "cstSellCap", 100, { from: superAdmin });
      await registry.setStorageUIntValue("cstStorage", "cstMinimumEthBalance", web3.toWei(0.2, "ether"), { from: superAdmin });
      await registry.setStorageAddressValue("cstStorage", "cstFoundation", foundation, { from: superAdmin });

      cst1 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      cst2 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await ledger.mintTokens(100);
    });

    it("allows the registry superadmin to add a contract to the registry", async function() {
      let txn = await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });

      let hash = await registry.getContractHash("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      assert.equal(txn.logs.length, 1, 'only one event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("CardStack Token"), "The contract hash is correct");

      assert.equal(txn.logs[0].event, "ContractRegistered");
      assert.equal(txn.logs[0].args.contractAddress, cst1.address, "the contract address is correct");
      assert.equal(txn.logs[0].args.name, "CardStack Token", "the contract name is correct");
    });

    it("does not allow a non-owner to register a contract", async function() {
      let nonOwner = accounts[3];
      let exceptionThrown;

      try {
        await registry.register("CardStack Token", cst1.address, false, { from: nonOwner });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      assert.equal(count, 0, "contract count is correct");
      assert.equal(contractName.toString(), "", "contract name is correct");
      assert.equal(contractAddress.toString(), NULL_ADDRESS, "The contract address is correct");
    });

    it("does not allow a contract to be registered more than once", async function() {
      await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });
      let exceptionThrown;

      try {
        await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
    });

    it("allows the registry superAdmin to upgrade a contract", async function() {
      await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });

      let txn = await registry.upgradeContract("CardStack Token", cst2.address, false, { from: superAdmin });

      let hash = await registry.getContractHash("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();


      assert.ok(txn.logs.length > 0, 'an event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst2.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("CardStack Token"), "The contract hash is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, cst2.address, "the address is correct");
      assert.equal(cst2Predecessor, cst1.address, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");

      let event = txn.logs.find(event => event.event === "ContractUpgraded");

      assert.equal(event.event, "ContractUpgraded");
      assert.equal(event.args.predecessor, cst1.address, "the contract address is correct");
      assert.equal(event.args.successor, cst2.address, "the contract address is correct");
      assert.equal(event.args.name, "CardStack Token", "the contract name is correct");
    });

    it("does not allow a non-owner to upgrade a contract", async function()  {
      await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });

      let nonOwner = accounts[3];
      let exceptionThrown;

      try {
        await registry.upgradeContract("CardStack Token", cst2.address, false, { from: nonOwner });
      } catch (err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");
    });

    it("does not allow a contract that hasnt been registered to be upgraded", async function() {
      let exceptionThrown;

      try {
        await registry.upgradeContract("CardStack Token", cst2.address, false, { from: superAdmin });
      } catch(err) {
        exceptionThrown = true;
      }

      assert.ok(exceptionThrown, "Exception was thrown");

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(count, 0, "contract count is correct");
      assert.equal(contractName.toString(), "", "contract name is correct");
      assert.equal(contractAddress.toString(), NULL_ADDRESS, "The contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");
    });

    it("can preserve contract state through a contract upgrade", async function() {
      await registry.register("CardStack Token", cst1.address, false, { from: superAdmin });

      let buyerAccount = accounts[8];
      let recipientAccount = accounts[4];
      let txnValue = web3.toWei(0.2, "ether");

      await cst1.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let cstBalance = await cst1.balanceOf(buyerAccount);
      assert.equal(asInt(cstBalance), 2, "The CST balance is correct");

      await registry.upgradeContract("CardStack Token", cst2.address, false, { from: superAdmin });

      let totalInCirculation = await cst2.totalInCirculation();
      cstBalance = await cst2.balanceOf(buyerAccount);

      assert.equal(asInt(cstBalance), 2, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 2, "The CST total in circulation was updated correctly");

      let transferAmount = 2;

      await cst2.transfer(recipientAccount, transferAmount, {
        from: buyerAccount,
        gasPrice: GAS_PRICE
      });

      let senderBalance = await cst2.balanceOf(buyerAccount);
      let recipientBalance = await cst2.balanceOf(recipientAccount);
      totalInCirculation = await cst2.totalInCirculation();
      let name = await cst2.name();
      let symbol = await cst2.symbol();
      let buyPrice = await cst2.buyPrice();
      let sellPrice = await cst2.sellPrice();
      let sellCap = await cst2.sellCap();
      let minimumEthBalance = await cst2.minimumEthBalance();
      let foundationAddress = await cst2.foundation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 2, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 2, "The CST total in circulation has not changed");

      assert.equal(name, "CardStack Token", "the name is correct");
      assert.equal(symbol, "CST", "the symbol is correct");
      assert.equal(buyPrice.toNumber(), web3.toWei(0.1, "ether"), "the buyPrice is correct");
      assert.equal(sellPrice.toNumber(), web3.toWei(0.1, "ether"), "the sellPrice is correct");
      assert.equal(sellCap.toNumber(), 100, "the sellCap is correct");
      assert.equal(minimumEthBalance.toNumber(), web3.toWei(0.2, "ether"), "the minimumEthBalance is correct");
      assert.equal(foundationAddress, foundation, "the foundation address is correct");
    });

    xit("allows token to be paused after registration so that storage can be changed before token is live", async function() {
    });

    xit("allows superAdmin to delete storage", async function() {
    });
    xit("does not allow superAdmin to delete storage", async function() {
    });
    xit("does not allow non-superAdmin to addStorage", async function() {
    });
    xit("does not allow non-superAdmin to register", async function() {
    });
    xit("does not allow non-superAdmin to upgradeContract", async function() {
    });

    xit("allows registry owner to add a new version of the registry", async function() {
    });

    xit("allows superAdmin to set uint value", async function () {
    });

    xit("does not allow non-superAdmin to set uint value", async function() {
    });

    xit("allows superAdmin to set bytes32 value", async function () {
    });

    xit("does not allow non-superAdmin to set bytes32 value", async function() {
    });

    xit("allows superAdmin to set ledger balance value", async function () {
    });

    xit("does not allow non-superAdmin to set ledger balance value", async function() {
    });

    xit("allows superAdmin to set address value", async function () {
    });

    xit("does not allow non-superAdmin to set address value", async function() {
    });

    xit("allows superAdmin to set bytes value", async function () {
    });

    xit("does not allow non-superAdmin to set bytes value", async function() {
    });

    xit("allows superAdmin to set boolean value", async function () {
    });

    xit("does not allow non-superAdmin to set boolean value", async function() {
    });

    xit("allows superAdmin to set int value", async function () {
    });

    xit("does not allow non-superAdmin to set int value", async function() {
    });

    xit("so many `unlessUpgraded` tests...", async function() {
    });
  });
});
