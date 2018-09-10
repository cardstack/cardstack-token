const { proxyContract } = require('./utils');
const {
  NULL_ADDRESS,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert,
} = require("../lib/utils");
const { isAddress } = require("./utils");
const TestingRegistry = artifacts.require("./TestingRegistry.sol");
const TestingCardstackToken = artifacts.require("./TestingCardstackToken.sol");
const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const STANLEYNICKEL_NAMEHASH = "0x88e78f6dbb1ac224ed76cf893bad9a933f96f9560e41b507dc69a397594374d4";
const CARD_CARDSTACK_NAMEHASH = "0x43d3399c341e8916a0010cf9c3d19c938db85ac9f12045c61fb887a021ece7f0"; // namehash for card.cardstack.eth

contract('Registry', function(accounts) {
  let proxyAdmin = accounts[41];

  describe("register contract", function() {
    let registry;
    let storage;
    let ledger;
    let cst1;
    let cst2;
    let superAdmin = accounts[19];
    let foundation = accounts[31];

    beforeEach(async function() {
      ledger = (await proxyContract(TestingCstLedger, proxyAdmin)).contract;
      storage = await Storage.new();
      registry = (await proxyContract(TestingRegistry, proxyAdmin)).contract;
      await registry.addSuperAdmin(superAdmin);
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);

      await storage.setBytes32Value("cstTokenName", web3.toHex("cst"));
      await storage.setBytes32Value("cstTokenSymbol", web3.toHex("CST"));
      await storage.setUIntValue("cstBuyPrice", 10);
      await storage.setUIntValue("cstCirculationCap", web3.toWei(100, 'ether'));
      await storage.setAddressValue("cstFoundation", foundation);

      cst1 = (await proxyContract(TestingCardstackToken, proxyAdmin, registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      })).contract;
      cst2 = (await proxyContract(TestingCardstackToken, proxyAdmin, registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      })).contract;
      await ledger.mintTokens(web3.toWei(100, 'ether'));
    });

    it("allows the registry super admin to set a new namehash for a registered contract", async function() {
      await registry.register("cst", cst1.address, NULL_ADDRESS, { from: superAdmin });
      await cst1.freezeToken(false);

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
      await cst1.freezeToken(false);

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
      await cst1.freezeToken(false);

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
      await cst1.freezeToken(false);

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
      await cst1.freezeToken(false);
      await registry.register("cst2", cst2.address, NULL_ADDRESS, { from: superAdmin });
      await cst2.freezeToken(false);

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
      await cst1.freezeToken(false);

      await assertRevert(async () => await registry.setNamehash("cst", NULL_ADDRESS, { from: superAdmin }));

      let hash = await registry.getContractHash("cst");
      let namehash = await registry.namehashForHash(hash);
      let ensResolvedAddrCardstack = await registry.addr(CARDSTACK_NAMEHASH);

      assert.equal(namehash, CARDSTACK_NAMEHASH, "The contract namehash is correct");
      assert.equal(ensResolvedAddrCardstack, cst1.address, "The ENS resolved contract address is correct");
    });

    it("allows the registry superadmin to add a contract to the registry", async function() {
      let txn = await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.freezeToken(false);

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

    it("places a newly registered contract in a frozen state", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });

      let isFrozen = await cst1.frozenToken();
      assert.equal(isFrozen, true, 'a newly registered token is placed in a frozen state');
    });

    it("does not allow a non-super admin to register a contract", async function() {
      let nonSuperAdmin = accounts[3];

      await assertRevert(async () => await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: nonSuperAdmin }));

      let count = await registry.numContracts();

      assert.equal(count, 0, "contract count is correct");
    });

    it("does not allow a contract to be registered more than once", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.freezeToken(false);

      await assertRevert(async () => await registry.register("cst", cst1.address, STANLEYNICKEL_NAMEHASH, { from: superAdmin }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let isRegistrySuperAdmin = await cst1.superAdmins(registry.address);
      let superAdminCount = await cst1.totalSuperAdminsMapping();
      let lastSuperAdmin = await cst1.superAdminsForIndex(superAdminCount.toNumber() - 1);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(lastSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");
    });

    it("allows a contract to be registered without a namehash", async function() {
      let txn = await registry.register("cst", cst1.address, NULL_ADDRESS, { from: superAdmin });
      await cst1.freezeToken(false);

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
      await cst1.freezeToken(false);

      await assertRevert(async () => await registry.register("cst2", cst2.address, CARDSTACK_NAMEHASH, { from: superAdmin }));

      let hash = web3.sha3("cst");
      let count = await registry.numContracts();
      let contractName = await registry.contractNameForIndex(0);
      let contractAddress = await registry.contractForHash(hash);
      let isRegistrySuperAdmin = await cst1.superAdmins(registry.address);
      let superAdminCount = await cst1.totalSuperAdminsMapping();
      let lastSuperAdmin = await cst1.superAdminsForIndex(superAdminCount.toNumber() - 1);

      assert.equal(count, 1, "contract count is correct");
      assert.equal(contractName.toString(), "cst", "contract name is correct");
      assert.equal(contractAddress.toString(), cst1.address, "The contract address is correct");
      assert.ok(isRegistrySuperAdmin, "the registry is the super admin for the cst contract");
      assert.equal(lastSuperAdmin, registry.address, "the super admin by index is correct for the cst contract");
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

  });
});
