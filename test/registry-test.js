const { NULL_ADDRESS } = require("../lib/utils");
const Registry = artifacts.require("./Registry.sol");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('Registry', function(accounts) {
  describe("register contract", function() {
    let registry;
    let cst1;
    let cst2;

    beforeEach(async function() {
      let ledger = await CstLedger.new();
      let storage = await Storage.new();
      registry = await Registry.new();
      cst1 = await CardStackToken.new(ledger.address, storage.address);
      cst2 = await CardStackToken.new(ledger.address, storage.address);

      await cst1.addAdmin(registry.address);
      await cst2.addAdmin(registry.address);
      await storage.addAdmin(cst1.address);
      await ledger.addAdmin(cst1.address);
      await storage.addAdmin(cst2.address);
      await ledger.addAdmin(cst2.address);
      await ledger.mintTokens(100);
      await cst1.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100);
      await cst2.initializeFromStorage();
    });

    it("allows the registry owner to add a contract to the registry", async function() {
      let txn = await registry.addContract("CardStack Token", cst1.address);

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
        await registry.addContract("CardStack Token", cst1.address, { from: nonOwner });
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
      await registry.addContract("CardStack Token", cst1.address);
      let exceptionThrown;

      try {
        await registry.addContract("CardStack Token", cst1.address);
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

    it("allows the registry owner to upgrade a contract", async function() {
      await registry.addContract("CardStack Token", cst1.address);

      let txn = await registry.upgradeContract("CardStack Token", cst2.address);

      let hash = await registry.getContractHash("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(txn.logs.length, 1, 'only one event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst2.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("CardStack Token"), "The contract hash is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, cst2.address, "the address is correct");
      assert.equal(cst2Predecessor, cst1.address, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");

      assert.equal(txn.logs[0].event, "ContractUpgraded");
      assert.equal(txn.logs[0].args.predecessor, cst1.address, "the contract address is correct");
      assert.equal(txn.logs[0].args.successor, cst2.address, "the contract address is correct");
      assert.equal(txn.logs[0].args.name, "CardStack Token", "the contract name is correct");
    });

    it("does not allow a non-owner to upgrade a contract", async function()  {
      await registry.addContract("CardStack Token", cst1.address);

      let nonOwner = accounts[3];
      let exceptionThrown;

      try {
        await registry.upgradeContract("CardStack Token", cst2.address, { from: nonOwner });
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
        await registry.upgradeContract("CardStack Token", cst2.address);
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

  });
});
