const {
  NULL_ADDRESS,
  GAS_PRICE,
  CST_DEPLOY_GAS_LIMIT,
  assertRevert,
  asInt
} = require("../lib/utils");
const { isAddress } = require("./utils");
const Registry = artifacts.require("./Registry.sol");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");

contract('Registry', function(accounts) {
  describe("register contract", function() {
    let registry;
    let storage;
    let ledger;
    let cst1;
    let cst2;
    let superAdmin = accounts[19];
    let foundation = accounts[31];

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
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
      await registry.setStorageAddressValue("cstStorage", "cstFoundation", foundation, { from: superAdmin });

      cst1 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      });
      cst2 = await CardStackToken.new(registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      });
      await cst1.setAllowTransfers(true);
      await cst2.setAllowTransfers(true);
      await ledger.mintTokens(100);
    });

    it("allows the registry superadmin to add a contract to the registry", async function() {
      let txn = await registry.register("CardStack Token", cst1.address, { from: superAdmin });

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
      assert.equal(txn.logs[0].args._contract, cst1.address, "the contract address is correct");
      assert.equal(txn.logs[0].args._name, "CardStack Token", "the contract name is correct");
    });

    it("does not allow a non-owner to register a contract", async function() {
      let nonOwner = accounts[3];

      await assertRevert(async () => await registry.register("CardStack Token", cst1.address, { from: nonOwner }));

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      assert.equal(count, 0, "contract count is correct");
      assert.equal(contractName.toString(), "", "contract name is correct");
      assert.equal(contractAddress.toString(), NULL_ADDRESS, "The contract address is correct");
    });

    it("does not allow a contract to be registered more than once", async function() {
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });

      await assertRevert(async () => await registry.register("CardStack Token", cst1.address, { from: superAdmin }));

      let hash = web3.sha3("CardStack Token");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let isRegistrySuperAdmin = await cst1.superAdmins(registry.address);
      let superAdminCount = await cst1.totalSuperAdminsMapping();
      let firstSuperAdmin = await cst1.superAdminsForIndex(0);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "CardStack Token", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(superAdminCount, 1, "the super admin count is correct for the cst contract");
      assert.equal(firstSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");
    });

    it("allows the registry superAdmin to upgrade a contract", async function() {
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });

      let txn = await registry.upgradeContract("CardStack Token", cst2.address, { from: superAdmin });

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
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });

      let nonOwner = accounts[3];

      await assertRevert(async () => await registry.upgradeContract("CardStack Token", cst2.address, { from: nonOwner }));

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

    it("does not allow a non-super-admin to upgrade a contract", async function()  {
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });

      let nonSuperAdmin = accounts[11];

      await assertRevert(async () => await registry.upgradeContract("CardStack Token", cst2.address, { from: nonSuperAdmin }));

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

      await assertRevert(async () => await registry.upgradeContract("CardStack Token", cst2.address, { from: superAdmin }));

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
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });
      await cst1.configure(web3.toHex("CardStack Token"),
                           web3.toHex("CST"),
                           web3.toWei(0.1, "ether"),
                           100,
                           100,
                           1000000,
                           foundation);

      let buyerAccount = accounts[8];
      let recipientAccount = accounts[4];
      let txnValue = web3.toWei(0.2, "ether");

      await cst1.addBuyer(buyerAccount);
      await cst1.buy({
        from: buyerAccount,
        value: txnValue,
        gasPrice: GAS_PRICE
      });

      let cstBalance = await cst1.balanceOf(buyerAccount);
      assert.equal(asInt(cstBalance), 2, "The CST balance is correct");

      await registry.upgradeContract("CardStack Token", cst2.address, { from: superAdmin });
      await cst2.setAllowTransfers(true);

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
      let sellCap = await cst2.sellCap();
      let foundationAddress = await cst2.foundation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 2, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 2, "The CST total in circulation has not changed");

      assert.equal(name, "CardStack Token", "the name is correct");
      assert.equal(symbol, "CST", "the symbol is correct");
      assert.equal(buyPrice.toNumber(), web3.toWei(0.1, "ether"), "the buyPrice is correct");
      assert.equal(sellCap.toNumber(), 100, "the sellCap is correct");
      assert.equal(foundationAddress, foundation, "the foundation address is correct");
    });

    it("can preserve allowance state through a contract upgrade", async function() {
      let grantor = accounts[23];
      let spender = accounts[31];
      let recipient = accounts[37];

      await ledger.debitAccount(grantor, 50);
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });
      await cst1.approve(spender, 10, { from: grantor });

      let allowance = await cst1.allowance(grantor, spender);
      let grantorBalance = await cst1.balanceOf(grantor);
      let spenderBalance = await cst1.balanceOf(spender);
      let recipientBalance = await cst1.balanceOf(recipient);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(spenderBalance), 0, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");

      await registry.upgradeContract("CardStack Token", cst2.address, { from: superAdmin });

      await cst2.setAllowTransfers(true);
      allowance = await cst2.allowance(grantor, spender);
      grantorBalance = await cst2.balanceOf(grantor);
      spenderBalance = await cst2.balanceOf(spender);
      recipientBalance = await cst2.balanceOf(recipient);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(spenderBalance), 0, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");

      await cst2.transferFrom(grantor, recipient, 10, { from: spender });

      allowance = await cst2.allowance(grantor, spender);
      grantorBalance = await cst2.balanceOf(grantor);
      spenderBalance = await cst2.balanceOf(spender);
      recipientBalance = await cst2.balanceOf(recipient);

      assert.equal(asInt(allowance), 0, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 40, "the balance is correct");
      assert.equal(asInt(spenderBalance), 0, "the balance is correct");
      assert.equal(asInt(recipientBalance), 10, "the balance is correct");
    });

    it("allows superAdmin to delete storage", async function() {
      let cstStorage = await registry.getStorage("cstStorage");
      assert.ok(isAddress(cstStorage), "storage exists");

      await registry.removeStorage("cstStorage");

      cstStorage = await registry.getStorage("cstStorage");
      assert.notOk(isAddress(cstStorage), "storage does not exist");
    });

    it("does not allow non-superAdmin to delete storage", async function() {
      let nonSuperAdmin = accounts[8];
      let cstStorage = await registry.getStorage("cstStorage");
      assert.ok(isAddress(cstStorage), "storage exists");

      await assertRevert(async () => await registry.removeStorage("cstStorage", { from: nonSuperAdmin }));
      cstStorage = await registry.getStorage("cstStorage");
      assert.ok(isAddress(cstStorage), "storage was not deleted");
    });

    it("does not allow non-superAdmin to addStorage", async function() {
      let nonSuperAdmin = accounts[8];
      let newStorage = await Storage.new();

      await assertRevert(async () => await registry.addStorage("lmnopStorage", newStorage.address, { from: nonSuperAdmin }));
      let lmnopStorage = await registry.getStorage("lmnopStorage");
      assert.notOk(isAddress(lmnopStorage), "storage was not added");
    });

    it("does not allow non-superAdmin to register", async function() {
      let nonSuperAdmin = accounts[8];

      let numContracts = await registry.numContracts();
      assert.equal(numContracts, 0, "there are no contracts");

      await assertRevert(async () => await registry.register("Stanley Nickel", cst1.address, { from: nonSuperAdmin }));
      numContracts = await registry.numContracts();
      assert.equal(numContracts, 0, "there are still no contracts");
    });

    it("allows registry owner to add a new version of the registry", async function() {
      let newRegistry = await Registry.new();

      let isDeprecatedRegistry = await registry.isDeprecated();
      let isDeprecatedNewRegistry = await newRegistry.isDeprecated();
      let registrySuccessor = await registry.successor();
      let newRegistrySuccessor = await newRegistry.successor();
      let registryPredecessor = await registry.predecessor();
      let newRegistryPredecessor = await newRegistry.predecessor();

      assert.notOk(isDeprecatedRegistry, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedNewRegistry, "the isDeprecated value is correct");
      assert.equal(registryPredecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(newRegistryPredecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(registrySuccessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(newRegistrySuccessor, NULL_ADDRESS, 'the contract address is correct');

      let upgradeToTxn = await registry.upgradeTo(newRegistry.address);
      let upgradedFromTxn = await newRegistry.upgradedFrom(registry.address);

      isDeprecatedRegistry = await registry.isDeprecated();
      isDeprecatedNewRegistry = await newRegistry.isDeprecated();
      registrySuccessor = await registry.successor();
      newRegistrySuccessor = await newRegistry.successor();
      registryPredecessor = await registry.predecessor();
      newRegistryPredecessor = await newRegistry.predecessor();

      assert.ok(isDeprecatedRegistry, "the isDeprecated value is correct");
      assert.notOk(isDeprecatedNewRegistry, "the isDeprecated value is correct");
      assert.equal(registryPredecessor, NULL_ADDRESS, 'the contract address is correct');
      assert.equal(newRegistryPredecessor, registry.address, 'the contract address is correct');
      assert.equal(registrySuccessor, newRegistry.address, 'the contract address is correct');
      assert.equal(newRegistrySuccessor, NULL_ADDRESS, 'the contract address is correct');

      assert.equal(upgradeToTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradedFromTxn.logs.length, 1, 'the correct number of events were fired');
      assert.equal(upgradeToTxn.logs[0].event, "Upgraded", "the event type is correct");
      assert.equal(upgradeToTxn.logs[0].args.successor, newRegistry.address);
      assert.equal(upgradedFromTxn.logs[0].event, "UpgradedFrom", "the event type is correct");
      assert.equal(upgradedFromTxn.logs[0].args.predecessor, registry.address);
    });

    it("allows superAdmin to set uint value", async function () {
      await registry.register("CardStack Token", cst1.address, { from: superAdmin });
      await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.2, "ether"), { from: superAdmin });
      await cst1.configureFromStorage();

      let buyPrice = await cst1.buyPrice();
      assert.equal(buyPrice.toNumber(), web3.toWei(0.2, "ether"), "uint value was set by super admin");
    });

    it("does not allow non-superAdmin to set uint value", async function() {
      let nonSuperAdmin = accounts[8];

      await registry.register("CardStack Token", cst1.address, { from: superAdmin });

      await assertRevert(async () => await registry.setStorageUIntValue("cstStorage", "cstBuyPrice", web3.toWei(0.2, "ether"), { from: nonSuperAdmin }));

      await cst1.configureFromStorage();
      let buyPrice = await cst1.buyPrice();
      assert.equal(buyPrice.toNumber(), web3.toWei(0.1, "ether"), "buy price did not change");
    });

    it("allows superAdmin to set bytes32 value", async function () {
      await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("XYZ"), { from: superAdmin });

      let cstTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      assert.equal(web3.toUtf8(cstTokenSymbol.toString()), "XYZ", "bytes32 value was set by super admin");
    });

    it("does not allow non-superAdmin to set bytes32 value", async function() {
      let nonSuperAdmin = accounts[8];

      let cstTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      assert.equal(web3.toUtf8(cstTokenSymbol.toString()), "CST", "bytes32 value is set");

      await assertRevert(async () => await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("XYZ"), { from: nonSuperAdmin }));
      cstTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
      assert.equal(web3.toUtf8(cstTokenSymbol.toString()), "CST", "bytes32 value has not changed");
    });

    it("allows superAdmin to set boolean ledger value", async function () {
      let someAccount = accounts[9];
      await registry.setBooleanLedgerValue("cstStorage", "isActive", someAccount, true, { from: superAdmin });

      let isActive = await storage.getBooleanLedgerValue("isActive", someAccount);
      assert.equal(isActive, true, "boolean value was set by super admin");
    });

    it("does not allow non-superAdmin to set boolean ledger value", async function() {
      let nonSuperAdmin = accounts[8];
      let someAccount = accounts[9];

      let isActive = await storage.getBooleanLedgerValue("isActive", someAccount);
      assert.equal(isActive, false, "value is false");

      await assertRevert(async () => await registry.setBooleanLedgerValue("cstStorage", "isActive", someAccount, true, { from: nonSuperAdmin }));
      isActive = await storage.getBooleanLedgerValue("cstBalance", someAccount);
      assert.equal(isActive, false, "value is still false");
    });

    it("allows superAdmin to set ledger value", async function () {
      let someAccount = accounts[9];
      await registry.setLedgerValue("cstStorage", "cstBalance", someAccount, 30, { from: superAdmin });

      let balance = await storage.getLedgerValue("cstBalance", someAccount);
      assert.equal(balance, 30, "ledger value was set by super admin");
    });

    it("does not allow non-superAdmin to set ledger value", async function() {
      let nonSuperAdmin = accounts[8];
      let someAccount = accounts[9];

      let balance = await storage.getLedgerValue("cstBalance", someAccount);
      assert.equal(balance, 0, "ledger value is 0");

      await assertRevert(async () => await registry.setLedgerValue("cstStorage", "cstBalance", someAccount, 30, { from: nonSuperAdmin }));
      balance = await storage.getLedgerValue("cstBalance", someAccount);
      assert.equal(balance, 0, "ledger value is still 0");
    });

    it("allows superAdmin to set address value", async function () {
      await registry.setStorageAddressValue("cstStorage", "cstAddress", cst1.address, { from: superAdmin });

      let cstAddress = await storage.getAddressValue("cstAddress");
      assert.equal(cstAddress, cst1.address, "address value was set by super admin");
    });

    it("does not allow non-superAdmin to set address value", async function() {
      let nonSuperAdmin = accounts[8];

      let cstAddress = await storage.getAddressValue("cstAddress");
      assert.equal(web3.toUtf8(cstAddress), "", "storage address value is empty");

      await assertRevert(async () => await registry.setStorageAddressValue("cstStorage", "cstAddress", cst1.address, { from: nonSuperAdmin }));
      cstAddress = await storage.getAddressValue("cstAddress");
      assert.equal(web3.toUtf8(cstAddress), "", "storage address value is still empty");
    });

    it("allows superAdmin to set bytes value", async function () {
      await registry.setStorageBytesValue("cstStorage", "somebytes", "lmnop", { from: superAdmin });

      let somebytes = await storage.getBytesValue("somebytes");
      assert.equal(web3.toUtf8(somebytes.toString()), "lmnop", "bytes value was set by super admin");
    });

    it("does not allow non-superAdmin to set bytes value", async function() {
      let nonSuperAdmin = accounts[8];

      let somebytes = await storage.getBytesValue("somebytes");
      assert.equal(web3.toUtf8(somebytes.toString()), "", "bytes value is empty");

      await assertRevert(async () => await registry.setStorageBytesValue("cstStorage", "somebytes", "lmnop", { from: nonSuperAdmin }));
      somebytes = await storage.getBytesValue("somebytes");
      assert.equal(web3.toUtf8(somebytes.toString()), "", "bytes value is still empty");
    });

    it("allows superAdmin to set boolean value", async function () {
      await registry.setStorageBooleanValue("cstStorage", "somebool", true, { from: superAdmin });

      let somebool = await storage.getBooleanValue("somebool");
      assert.equal(somebool, true, "boolean value was set by super admin");
    });

    it("does not allow non-superAdmin to set boolean value", async function() {
      let nonSuperAdmin = accounts[8];

      let somebool = await storage.getBooleanValue("somebool");
      assert.equal(somebool, false, "boolean value is not set");

      await assertRevert(async () => await registry.setStorageBooleanValue("cstStorage", "somebool", true, { from: nonSuperAdmin }));
      somebool = await storage.getBooleanValue("somebool");
      assert.equal(somebool, false, "boolean value is still not set");
    });

    it("allows superAdmin to set int value", async function () {
      await registry.setStorageIntValue("cstStorage", "someint", 23, { from: superAdmin });

      let someint = await storage.getIntValue("someint");
      assert.equal(someint, 23, "int value was set by super admin");
    });

    it("does not allow non-superAdmin to set int value", async function() {
      let nonSuperAdmin = accounts[8];

      let someint = await storage.getIntValue("someint");
      assert.equal(someint, 0, "int value is not set");

      await assertRevert(async () => await registry.setStorageIntValue("cstStorage", "someint", 23, { from: nonSuperAdmin }));
      someint = await storage.getIntValue("someint");
      assert.equal(someint, 0, "int value is still not set");
    });

    it("allows superAdmin to set multi-ledger value", async function () {
      let someAccount = accounts[9];
      let anotherAccount = accounts[19];
      await registry.setMultiLedgerValue("cstStorage", "allowance", someAccount, anotherAccount, 30, { from: superAdmin });

      let balance = await storage.getMultiLedgerValue("allowance", someAccount, anotherAccount);
      assert.equal(balance, 30, "multi-ledger value was set by super admin");
    });

    it("does not allow non-superAdmin to set multi-ledger value", async function() {
      let nonSuperAdmin = accounts[8];
      let someAccount = accounts[9];
      let anotherAccount = accounts[19];

      let balance = await storage.getMultiLedgerValue("allowance", someAccount, anotherAccount);
      assert.equal(balance, 0, "ledger value is 0");

      await assertRevert(async () => await registry.setMultiLedgerValue("cstStorage", "allowance", someAccount, anotherAccount, 30, { from: nonSuperAdmin }));
      balance = await storage.getMultiLedgerValue("allowance", someAccount, anotherAccount);
      assert.equal(balance, 0, "ledger value is still 0");
    });


    describe("unlessUpgraded", function() {
      beforeEach(async function() {
        let newRegistry = await Registry.new();

        // we do this so that we can test upgradeContract
        await registry.register("CardStack Token", cst1.address, { from: superAdmin });

        await registry.upgradeTo(newRegistry.address);
        await newRegistry.upgradedFrom(registry.address);
      });

      it("does not allow superAdmin to register if registry is upgraded", async function() {

        let numContracts = await registry.numContracts();
        assert.equal(numContracts, 1, "there is one contract");

        await assertRevert(async () => await registry.register("Stanley Nickel", cst2.address, { from: superAdmin }));
        numContracts = await registry.numContracts();
        assert.equal(numContracts, 1, "there is still one contract");
      });

      it("does not allow superAdmin to upgrade contract if registry is upgraded", async function() {
        await assertRevert(async () => await registry.upgradeContract("CardStack Token", cst2.address, { from: superAdmin }));
      });

      it("does not allow superAdmin to delete storage if registry is upgraded", async function() {
        await assertRevert(async () => await registry.removeStorage("cstStorage", { from: superAdmin }));
      });

      it("does not allow superAdmin to addStorage if registry is upgraded", async function() {
        let newStorage = await Storage.new();
        await assertRevert(async () => await registry.addStorage("lmnopStorage", newStorage.address, { from: superAdmin }));
      });

      it("does not allow superAdmin to getStorage if registry is upgraded", async function() {
        await assertRevert(async () => await registry.getStorage("cstStorage", { from: superAdmin }));
      });

      it("does not allow superAdmin to set uint value if registry upgraded", async function() {
        let cstSellPrice = await storage.getBytes32Value("cstSellPrice");
        assert.equal(cstSellPrice, 0, "uint value is not set");

        await assertRevert(async () => await registry.setStorageUIntValue("cstStorage", "cstSellPrice", web3.toWei(0.2, "ether"), { from: superAdmin }));
        cstSellPrice = await storage.getBytes32Value("cstSellPrice");
        assert.equal(cstSellPrice, 0, "uint value is still not set");
      });

      it("does not allow superAdmin to set bytes32 value if registry upgraded", async function() {
        let cstTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
        assert.equal(web3.toUtf8(cstTokenSymbol.toString()), "CST", "bytes32 value is set");

        await assertRevert(async () => await registry.setStorageBytes32Value("cstStorage", "cstTokenSymbol", web3.toHex("XYZ"), { from: superAdmin }));
        cstTokenSymbol = await storage.getBytes32Value("cstTokenSymbol");
        assert.equal(web3.toUtf8(cstTokenSymbol.toString()), "CST", "bytes32 value has not changed");
      });

      it("does not allow superAdmin to set boolean ledger value if registry upgraded", async function() {
        let someAccount = accounts[9];

        let isActive = await storage.getBooleanLedgerValue("isActive", someAccount);
        assert.equal(isActive, 0, "value is 0");

        await assertRevert(async () => await registry.setBooleanLedgerValue("cstStorage", "isActive", someAccount, true, { from: superAdmin }));
        isActive = await storage.getBooleanLedgerValue("isActive", someAccount);
        assert.equal(isActive, false, "value is still false");
      });

      it("does not allow superAdmin to set ledger balance value if registry upgraded", async function() {
        let someAccount = accounts[9];

        let balance = await storage.getLedgerValue("cstBalance", someAccount);
        assert.equal(balance, 0, "ledger balance is 0");

        await assertRevert(async () => await registry.setLedgerValue("cstStorage", "cstBalance", someAccount, 30, { from: superAdmin }));
        balance = await storage.getLedgerValue("cstBalance", someAccount);
        assert.equal(balance, 0, "ledger balance is still 0");
      });

      it("does not allow superAdmin to set address value if registry upgraded", async function() {

        let cstAddress = await storage.getAddressValue("cstAddress");
        assert.equal(web3.toUtf8(cstAddress), "", "storage address value is empty");

        await assertRevert(async () => await registry.setStorageAddressValue("cstStorage", "cstAddress", cst1.address, { from: superAdmin }));
        cstAddress = await storage.getAddressValue("cstAddress");
        assert.equal(web3.toUtf8(cstAddress), "", "storage address value is still empty");
      });

      it("does not allow superAdmin to set bytes value if registry upgraded", async function() {
        let somebytes = await storage.getBytesValue("somebytes");
        assert.equal(web3.toUtf8(somebytes.toString()), "", "bytes value is empty");

        await assertRevert(async () => await registry.setStorageBytesValue("cstStorage", "somebytes", "lmnop", { from: superAdmin }));
        somebytes = await storage.getBytesValue("somebytes");
        assert.equal(web3.toUtf8(somebytes.toString()), "", "bytes value is still empty");
      });

      it("does not allow superAdmin to set boolean value if registry upgraded", async function() {
        let somebool = await storage.getBooleanValue("somebool");
        assert.equal(somebool, false, "boolean value is not set");

        await assertRevert(async () => await registry.setStorageBooleanValue("cstStorage", "somebool", true, { from: superAdmin }));
        somebool = await storage.getBooleanValue("somebool");
        assert.equal(somebool, false, "boolean value is still not set");
      });

      it("does not allow superAdmin to set int value if registry upgraded", async function() {

        let someint = await storage.getIntValue("someint");
        assert.equal(someint, 0, "int value is not set");

        await assertRevert(async () => await registry.setStorageIntValue("cstStorage", "someint", 23, { from: superAdmin }));
        someint = await storage.getIntValue("someint");
        assert.equal(someint, 0, "int value is still not set");
      });
    });

  });
});
