const {
  NULL_ADDRESS,
  GAS_PRICE,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
  asInt
} = require("../lib/utils");
const { isAddress } = require("./utils");
const Registry = artifacts.require("./Registry.sol");
const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const STANLEYNICKEL_NAMEHASH = "0x88e78f6dbb1ac224ed76cf893bad9a933f96f9560e41b507dc69a397594374d4";
const CARD_CARDSTACK_NAMEHASH = "0x43d3399c341e8916a0010cf9c3d19c938db85ac9f12045c61fb887a021ece7f0"; // namehash for card.cardstack.eth

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

      await storage.setBytes32Value("cstTokenName", web3.toHex("cst"));
      await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"));
      await storage.setUIntValue("cstBuyPrice", web3.toWei(0.1, "ether"));
      await storage.setUIntValue("cstCirculationCap", 100);
      await storage.setAddressValue("cstFoundation", foundation);

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

    it("allows the registry super admin to set a new namehash for a registered contract", async function() {
      await registry.register("cst", cst1.address, NULL_ADDRESS, { from: superAdmin });

      let txn = await registry.setNamehash("cst", CARDSTACK_NAMEHASH, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddr, cst1.address, "The ENS resolved contract address is correct");

      assert.equal(txn.logs.length, 1, 'the correct number of events was fired');
      assert.equal(txn.logs[0].event, "AddrChanged");
      assert.equal(txn.logs[0].args.node, CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(txn.logs[0].args.a, cst1.address, "the contract address is correct");
    });

    it("allows the registry super admin to change the namehash for a registered contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let txn = await registry.setNamehash("cst", STANLEYNICKEL_NAMEHASH, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddr = await registry.addr(STANLEYNICKEL_NAMEHASH);

      assert.equal(namehash, STANLEYNICKEL_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddr, cst1.address, "The ENS resolved contract address is correct");

      assert.equal(txn.logs.length, 1, 'the correct number of events was fired');
      assert.equal(txn.logs[0].event, "AddrChanged");
      assert.equal(txn.logs[0].args.node, STANLEYNICKEL_NAMEHASH, "the namehash is correct");
      assert.equal(txn.logs[0].args.a, cst1.address, "the contract address is correct");
    });

    it("allows the registry super admin to set a subdomain namehash and a bare domain namehash that point to the same contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let txn = await registry.setNamehash("cst", CARD_CARDSTACK_NAMEHASH, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddr1 = await registry.addr(CARDSTACK_NAMEHASH);
      let ensResolvedAddr2 = await registry.addr(CARD_CARDSTACK_NAMEHASH);

      assert.equal(namehash, CARD_CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddr1, cst1.address, "The ENS resolved contract address is correct");
      assert.equal(ensResolvedAddr2, cst1.address, "The ENS resolved contract address is correct");

      assert.equal(txn.logs.length, 1, 'the correct number of events was fired');
      assert.equal(txn.logs[0].event, "AddrChanged");
      assert.equal(txn.logs[0].args.node, CARD_CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(txn.logs[0].args.a, cst1.address, "the contract address is correct");
    });

    it("does not allow a non super admin to change the namehash for a registered contract", async function() {
      let nonSuperAdmin = accounts[3];
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      await assertRevert(async () => await registry.setNamehash("cst", STANLEYNICKEL_NAMEHASH, { from: nonSuperAdmin }));

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddrCardstack = await registry.addr(CARDSTACK_NAMEHASH);
      let ensResolvedAddrStanleyNickel = await registry.addr(STANLEYNICKEL_NAMEHASH);

      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddrCardstack, cst1.address, "The ENS resolved contract address is correct");
      assert.equal(ensResolvedAddrStanleyNickel, NULL_ADDRESS, "The ENS resolved contract address is correct");
    });

    it("does not allow registry super admin to create a namehash for non-existant contract", async function() {
      await assertRevert(async () => await registry.setNamehash("cst", STANLEYNICKEL_NAMEHASH, { from: superAdmin }));

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddrStanleyNickel = await registry.addr(STANLEYNICKEL_NAMEHASH);

      assert.equal(namehash, "0x0000000000000000000000000000000000000000000000000000000000000000", "The contract namehash is correct");
      assert.equal(ensResolvedAddrStanleyNickel, NULL_ADDRESS, "The ENS resolved contract address is correct");
    });

    it("does not allow registry super admin to create a duplicate namehash for a registered contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await registry.register("cst2", cst2.address, NULL_ADDRESS, { from: superAdmin });

      await assertRevert(async () => await registry.setNamehash("cst2", CARDSTACK_NAMEHASH, { from: superAdmin }));

      let hash = await registry.getContractHash("cst");
      let hash2 = await registry.getContractHash("cst2");
      let namehash = await registry.namehashForHash(hash);
      let namehash2 = await registry.namehashForHash(hash2);
      let ensResolvedAddrCardstack = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(namehash2, "0x0000000000000000000000000000000000000000000000000000000000000000", "The contract namehash is correct");
      assert.equal(ensResolvedAddrCardstack, cst1.address, "The ENS resolved contract address is correct");
    });

    it("does not alow registry super admin to create a null namehash for a registered contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      await assertRevert(async () => await registry.setNamehash("cst", NULL_ADDRESS, { from: superAdmin }));

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddrCardstack = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddrCardstack, cst1.address, "The ENS resolved contract address is correct");
    });

    it("allows the registry superadmin to add a contract to the registry", async function() {
      let txn = await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(txn.logs.length, 4, 'the correct number of events was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("cst"), "The contract hash is correct");
      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddr, cst1.address, "The ENS resolved contract address is correct");

      assert.equal(txn.logs[0].event, "AddAdmin");
      assert.equal(txn.logs[0].args.admin, cst1.address, "the CST contract is added as an admin of storage");

      assert.equal(txn.logs[1].event, "AddAdmin");
      assert.equal(txn.logs[1].args.admin, cst1.address, "the CST contract is added as an admin of ledger");

      assert.equal(txn.logs[2].event, "ContractRegistered");
      assert.equal(txn.logs[2].args._contract, cst1.address, "the contract address is correct");
      assert.equal(txn.logs[2].args._name, "cst", "the contract name is correct");

      assert.equal(txn.logs[3].event, "AddrChanged");
      assert.equal(txn.logs[3].args.node, CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(txn.logs[3].args.a, cst1.address, "the contract address is correct");
    });

    it("does not allow a non-super admin to register a contract", async function() {
      let nonSuperAdmin = accounts[3];

      await assertRevert(async () => await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: nonSuperAdmin }));

      let count = await registry.numContracts();

      assert.equal(count, 0, "contract count is correct");
    });

    it("does not allow a contract to be registered more than once", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      await assertRevert(async () => await registry.register("cst", cst1.address, STANLEYNICKEL_NAMEHASH, { from: superAdmin }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let isRegistrySuperAdmin = await cst1.superAdmins(registry.address);
      let superAdminCount = await cst1.totalSuperAdminsMapping();
      let firstSuperAdmin = await cst1.superAdminsForIndex(0);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(superAdminCount, 1, "the super admin count is correct for the cst contract");
      assert.equal(firstSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");
    });

    it("allows a contract to be registered without a namehash", async function() {
      let txn = await registry.register("cst", cst1.address, NULL_ADDRESS, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(txn.logs.length, 3, 'the correct number of events was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("cst"), "The contract hash is correct");
      assert.equal(namehash, "0x0000000000000000000000000000000000000000000000000000000000000000", "The contract namehash is 0x0");
      assert.equal(ensResolvedAddr, NULL_ADDRESS, "The ENS resolved contract address is 0x0");

      assert.equal(txn.logs[0].event, "AddAdmin");
      assert.equal(txn.logs[0].args.admin, cst1.address, "the CST contract is added as an admin of storage");

      assert.equal(txn.logs[1].event, "AddAdmin");
      assert.equal(txn.logs[1].args.admin, cst1.address, "the CST contract is added as an admin of ledger");

      assert.equal(txn.logs[2].event, "ContractRegistered");
      assert.equal(txn.logs[2].args._contract, cst1.address, "the contract address is correct");
      assert.equal(txn.logs[2].args._name, "cst", "the contract name is correct");
    });

    it("does not allow a contract to be registered with a duplicate namehash", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      await assertRevert(async () => await registry.register("cst2", cst2.address, CARDSTACK_NAMEHASH, { from: superAdmin }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let isRegistrySuperAdmin = await cst1.superAdmins(registry.address);
      let superAdminCount = await cst1.totalSuperAdminsMapping();
      let firstSuperAdmin = await cst1.superAdminsForIndex(0);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(superAdminCount, 1, "the super admin count is correct for the cst contract");
      assert.equal(firstSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");
    });

    it("allows the registry superAdmin to upgrade a contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let txn = await registry.upgradeContract("cst", cst2.address, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();


      assert.ok(txn.logs.length > 0, 'an event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst2.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("cst"), "The contract hash is correct");
      assert.equal(ensResolvedAddr, cst2.address, "The ENS resolved contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, cst2.address, "the address is correct");
      assert.equal(cst2Predecessor, cst1.address, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");

      let event = txn.logs.find(event => event.event === "ContractUpgraded");

      assert.equal(event.event, "ContractUpgraded");
      assert.equal(event.args.predecessor, cst1.address, "the contract address is correct");
      assert.equal(event.args.successor, cst2.address, "the contract address is correct");
      assert.equal(event.args.name, "cst", "the contract name is correct");

      event = txn.logs.find(event => event.event === "Transfer");
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(asInt(event.args._value), 100, "The amount minted is correct");
      assert.equal(event.args._from, cst1.address, "The from address is correct");
      assert.equal(event.args._to, cst2.address, "The to address is correct");

      let events = txn.logs.filter(event => event.event === "AddrChanged");
      assert.equal(events.length, 1, 'The number of AddrChanged events is correct');
      assert.equal(events[0].event, "AddrChanged");
      assert.equal(events[0].args.node, CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(events[0].args.a, cst2.address, "the contract address is correct");
    });

    it("allows the registry superAdmin to upgrade a contract that has a subdomain namehash and bare domain name hash that point to the upgraded contract", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await registry.setNamehash("cst", CARD_CARDSTACK_NAMEHASH, { from: superAdmin });

      let txn = await registry.upgradeContract("cst", cst2.address, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();


      assert.ok(txn.logs.length > 0, 'an event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst2.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("cst"), "The contract hash is correct");
      assert.equal(ensResolvedAddr, cst2.address, "The ENS resolved contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, cst2.address, "the address is correct");
      assert.equal(cst2Predecessor, cst1.address, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");

      let event = txn.logs.find(event => event.event === "ContractUpgraded");

      assert.equal(event.event, "ContractUpgraded");
      assert.equal(event.args.predecessor, cst1.address, "the contract address is correct");
      assert.equal(event.args.successor, cst2.address, "the contract address is correct");
      assert.equal(event.args.name, "cst", "the contract name is correct");

      event = txn.logs.find(event => event.event === "Transfer");
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(asInt(event.args._value), 100, "The amount minted is correct");
      assert.equal(event.args._from, cst1.address, "The from address is correct");
      assert.equal(event.args._to, cst2.address, "The to address is correct");

      let events = txn.logs.filter(event => event.event === "AddrChanged");
      assert.equal(events.length, 2, 'The number of AddrChanged events is correct');
      assert.equal(events[0].event, "AddrChanged");
      assert.equal(events[0].args.node, CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(events[0].args.a, cst2.address, "the contract address is correct");

      assert.equal(events[1].event, "AddrChanged");
      assert.equal(events[1].args.node, CARD_CARDSTACK_NAMEHASH, "the namehash is correct");
      assert.equal(events[1].args.a, cst2.address, "the contract address is correct");
    });

    it("allows the registry superAdmin to upgrade a contract that doesnt have a namehash", async function() {
      await registry.register("cst", cst1.address, NULL_ADDRESS, { from: superAdmin });

      let txn = await registry.upgradeContract("cst", cst2.address, { from: superAdmin });

      let hash = await registry.getContractHash("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let ensResolvedAddr = await registry.addr(CARDSTACK_NAMEHASH);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();


      assert.ok(txn.logs.length > 0, 'an event was fired');

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst2.address, "The contract address is correct");
      assert.equal(hash, web3.sha3("cst"), "The contract hash is correct");
      assert.equal(ensResolvedAddr, NULL_ADDRESS, "The ENS resolved contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, cst2.address, "the address is correct");
      assert.equal(cst2Predecessor, cst1.address, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");

      let event = txn.logs.find(event => event.event === "ContractUpgraded");

      assert.equal(event.event, "ContractUpgraded");
      assert.equal(event.args.predecessor, cst1.address, "the contract address is correct");
      assert.equal(event.args.successor, cst2.address, "the contract address is correct");
      assert.equal(event.args.name, "cst", "the contract name is correct");

      event = txn.logs.find(event => event.event === "Transfer");
      assert.equal(event.event, "Transfer", "The event type is correct");
      assert.equal(asInt(event.args._value), 100, "The amount minted is correct");
      assert.equal(event.args._from, cst1.address, "The from address is correct");
      assert.equal(event.args._to, cst2.address, "The to address is correct");

      event = txn.logs.find(event => event.event === "AddrChanged");
      assert.isNotOk(event, "No ENS AddrChanged event was fired");
    });

    it("does not allow a non-owner to upgrade a contract", async function()  {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let nonOwner = accounts[3];

      await assertRevert(async () => await registry.upgradeContract("cst", cst2.address, { from: nonOwner }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");
    });

    it("does not allow a non-super-admin to upgrade a contract", async function()  {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let nonSuperAdmin = accounts[11];

      await assertRevert(async () => await registry.upgradeContract("cst", cst2.address, { from: nonSuperAdmin }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");
    });

    it("does not allow a contract that hasnt been registered to be upgraded", async function() {

      await assertRevert(async () => await registry.upgradeContract("cst", cst2.address, { from: superAdmin }));

      let count = await registry.numContracts();

      let cst1Predecessor = await cst1.predecessor();
      let cst1Successor = await cst1.successor();
      let cst2Predecessor = await cst2.predecessor();
      let cst2Successor = await cst2.successor();

      assert.equal(count, 0, "contract count is correct");

      assert.equal(cst1Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst1Successor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Predecessor, NULL_ADDRESS, "the address is correct");
      assert.equal(cst2Successor, NULL_ADDRESS, "the address is correct");
    });

    it("can preserve contract state through a contract upgrade", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.configure(web3.toHex("cst"),
                           web3.toHex("CST"),
                           web3.toWei(0.1, "ether"),
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

      await registry.upgradeContract("cst", cst2.address, { from: superAdmin });
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
      let circulationCap = await cst2.circulationCap();
      let foundationAddress = await cst2.foundation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 2, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 2, "The CST total in circulation has not changed");

      assert.equal(name, "cst", "the name is correct");
      assert.equal(symbol, "CST", "the symbol is correct");
      assert.equal(buyPrice.toNumber(), web3.toWei(0.1, "ether"), "the buyPrice is correct");
      assert.equal(circulationCap.toNumber(), 100, "the circulationCap is correct");
      assert.equal(foundationAddress, foundation, "the foundation address is correct");
    });

    it("can preserve allowance state through a contract upgrade", async function() {
      let grantor = accounts[23];
      let spender = accounts[31];
      let recipient = accounts[37];

      await ledger.debitAccount(grantor, 50);
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.approve(spender, 10, { from: grantor });

      let allowance = await cst1.allowance(grantor, spender);
      let grantorBalance = await cst1.balanceOf(grantor);
      let spenderBalance = await cst1.balanceOf(spender);
      let recipientBalance = await cst1.balanceOf(recipient);

      assert.equal(asInt(allowance), 10, "the allowance is correct");
      assert.equal(asInt(grantorBalance), 50, "the balance is correct");
      assert.equal(asInt(spenderBalance), 0, "the balance is correct");
      assert.equal(asInt(recipientBalance), 0, "the balance is correct");

      await registry.upgradeContract("cst", cst2.address, { from: superAdmin });

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

      await assertRevert(async () => await registry.register("Stanley Nickel", STANLEYNICKEL_NAMEHASH, cst1.address, { from: nonSuperAdmin }));
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

      let upgradeToTxn = await registry.upgradeTo(newRegistry.address, 0);
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

    it("fires revert when the default function is called", async function() {
      await assertRevert(async () => await registry.sendTransaction());
    });

    it("supports the EIP-137 interface-meta interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0x01ffc9a7");
      assert.isOk(supportsInterface, "The interface ID is supported");
    });

    it("supports the EIP-137 address interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0x3b3b57de");
      assert.isOk(supportsInterface, "The interface ID is supported");
    });

    it("doesnt support the EIP-137 content interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0xd8389dc5");
      assert.isNotOk(supportsInterface, "The interface ID is not supported");
    });

    it("doesnt support the EIP-137 name interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0x691f3431");
      assert.isNotOk(supportsInterface, "The interface ID is not supported");
    });

    it("doesnt support the EIP-137 ABI interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0x2203ab56");
      assert.isNotOk(supportsInterface, "The interface ID is not supported");
    });

    it("doesnt support the EIP-137 pubkey interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0xc8690233");
      assert.isNotOk(supportsInterface, "The interface ID is not supported");
    });

    it("doesnt support the EIP-137 text interface ID", async function() {
      let supportsInterface = await registry.supportsInterface("0x59d1d43c");
      assert.isNotOk(supportsInterface, "The interface ID is not supported");
    });

    describe("unlessUpgraded", function() {
      beforeEach(async function() {
        let newRegistry = await Registry.new();

        // we do this so that we can test upgradeContract
        await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

        await registry.upgradeTo(newRegistry.address, 0);
        await newRegistry.upgradedFrom(registry.address);
      });

      it("does not allow superAdmin to register if registry is upgraded", async function() {

        let numContracts = await registry.numContracts();
        assert.equal(numContracts, 1, "there is one contract");

        await assertRevert(async () => await registry.register("Stanley Nickel", cst2.address, STANLEYNICKEL_NAMEHASH, { from: superAdmin }));
        numContracts = await registry.numContracts();
        assert.equal(numContracts, 1, "there is still one contract");
      });

      it("does not allow superAdmin to upgrade contract if registry is upgraded", async function() {
        await assertRevert(async () => await registry.upgradeContract("cst", cst2.address, { from: superAdmin }));
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

      it("does not allow superAdmin to set namehash if registry upgraded", async function() {
        await assertRevert(async () => await registry.setNamehash("cst", STANLEYNICKEL_NAMEHASH, { from: superAdmin }));
      });
    });
  });
});
