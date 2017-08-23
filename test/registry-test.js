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

    xit("does not allow a non-owner to register a contract", async function() {
    });

    xit("does not allow a contract to be registered more than once", async function() {
    });

    xit("allows the registry owner to upgrade a contract", async function() {
    });

    xit("does not allow a non-owner to upgrade a contract", async function()  {
    });

    xit("does not allow a contract that hasnt been registered to be upgraded", async function() {
    });

  });
});
