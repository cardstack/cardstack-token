const { proxyContract } = require('./utils');
const {
  GAS_PRICE,
  CST_DEPLOY_GAS_LIMIT,
  CARDSTACK_NAMEHASH,
  assertRevert
} = require("../lib/utils");
const CardstackToken = artifacts.require("./CardstackToken.sol");
const Registry = artifacts.require("./Registry.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const TestingRegistry = artifacts.require("./TestingRegistry.sol");
const Token_v1 = artifacts.require("./Token_v1.sol");
const Token_v2 = artifacts.require("./Token_v2.sol");
const TestingCstLedger = artifacts.require("./TestingCstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');

contract('CardstackToken', function(accounts) {
  let proxyAdmin = accounts[41];

  describe("upgrade contract", function() {
    let registry;
    let storage;
    let ledger;
    let cst1;
    let proxy;
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

      let zosProxy = (await proxyContract(Token_v1, proxyAdmin, registry.address, "cstStorage", "cstLedger", {
        gas: CST_DEPLOY_GAS_LIMIT
      }));
      cst1 = zosProxy.contract;
      proxy = zosProxy.proxy;

      await ledger.mintTokens(web3.toWei(100, 'ether'));
    });

    it('non-initializer cannot invoke CardstackToken initialize', async function() {
      let implementationContract = await CardstackToken.new({
        gas: CST_DEPLOY_GAS_LIMIT
      });
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await CardstackToken.at(proxy.address);

      await assertRevert(async () => await contract.initialize(registry.address, "cstStorage", "cstLedger"));
    });

    it('non-initializer cannot invoke CstLedger initialize', async function() {
      let implementationContract = await CstLedger.new({
        gas: CST_DEPLOY_GAS_LIMIT
      });
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await CstLedger.at(proxy.address);

      await assertRevert(async () => await contract.initialize());
    });

    it('non-initializer cannot invoke Registry initialize', async function() {
      let implementationContract = await Registry.new({
        gas: CST_DEPLOY_GAS_LIMIT
      });
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await Registry.at(proxy.address);

      await assertRevert(async () => await contract.initialize());
    });

    it('cannot initialize the CardstackToken proxy twice', async function() {
      let implementationContract = await Token_v1.new({
        gas: CST_DEPLOY_GAS_LIMIT
      });
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await Token_v1.at(proxy.address);

      await contract.initialize(registry.address, "cstStorage", "cstLedger");
      await assertRevert(async () => await contract.initialize(registry.address, "cstStorage", "cstLedger"));
    });

    it('cannot initialize the Registry proxy twice', async function() {
      let implementationContract = await TestingRegistry.new();
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await TestingRegistry.at(proxy.address);

      await contract.initialize();
      await assertRevert(async () => await contract.initialize());
    });

    it('cannot initialize the CstLedger proxy twice', async function() {
      let implementationContract = await TestingCstLedger.new();
      let proxy = await AdminUpgradeabilityProxy.new(implementationContract.address);

      await proxy.changeAdmin(proxyAdmin);

      let contract = await TestingCstLedger.at(proxy.address);

      await contract.initialize();
      await assertRevert(async () => await contract.initialize());
    });

    it("can preserve contract state through a contract upgrade", async function() {
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.freezeToken(false);
      await cst1.configure(web3.toHex("cst"),
        web3.toHex("CST"),
        10,
        web3.toWei(100, 'ether'),
        web3.toWei(1000000, 'ether'),
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
      let version = await cst1.getVersion();
      let errMsg;

      try {
        await cst1.foo();
      } catch (e) {
        errMsg = e.message;
      }

      assert.equal(errMsg, 'cst1.foo is not a function');
      assert.equal(cstBalance, web3.toWei(2, 'ether'), "The CST balance is correct");
      assert.equal(version, 'v1', 'the contract version is correct');

      let cst2Impl = await Token_v2.new({ gas: CST_DEPLOY_GAS_LIMIT });
      await proxy.upgradeTo(cst2Impl.address, { from: proxyAdmin });
      let cst2 = await Token_v2.at(proxy.address);

      let totalInCirculation = await cst2.totalInCirculation();
      cstBalance = await cst2.balanceOf(buyerAccount);

      assert.equal(cstBalance, web3.toWei(2, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(2, 'ether'), "The CST total in circulation was updated correctly");

      let transferAmount = web3.toWei(2, 'ether');

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
      let foo = await cst2.foo();
      version = await cst2.getVersion();

      assert.equal(version, 'v2', 'the contract version is correct');
      assert.equal(foo, 'bar', 'the upgraded contract has a new function');
      assert.equal(senderBalance.toNumber(), 0, "The CST balance is correct");
      assert.equal(recipientBalance, web3.toWei(2, 'ether'), "The CST balance is correct");
      assert.equal(totalInCirculation, web3.toWei(2, 'ether'), "The CST total in circulation has not changed");

      assert.equal(name, "cst", "the name is correct");
      assert.equal(symbol, "CST", "the symbol is correct");
      assert.equal(buyPrice.toNumber(), 10, "the buyPrice is correct");
      assert.equal(circulationCap, web3.toWei(100, 'ether'), "the circulationCap is correct");
      assert.equal(foundationAddress, foundation, "the foundation address is correct");
    });

    it("can preserve allowance state through a contract upgrade", async function() {
      let grantor = accounts[23];
      let spender = accounts[31];
      let recipient = accounts[37];

      await ledger.debitAccount(grantor, web3.toWei(50, 'ether'));
      await registry.register("cst", cst1.address, CARDSTACK_NAMEHASH, { from: superAdmin });
      await cst1.freezeToken(false);
      await cst1.approve(spender, web3.toWei(10, 'ether'), { from: grantor });

      let allowance = await cst1.allowance(grantor, spender);
      let grantorBalance = await cst1.balanceOf(grantor);
      let spenderBalance = await cst1.balanceOf(spender);
      let recipientBalance = await cst1.balanceOf(recipient);
      let version = await cst1.getVersion();

      assert.equal(allowance, web3.toWei(10, 'ether'), "the allowance is correct");
      assert.equal(grantorBalance, web3.toWei(50, 'ether'), "the balance is correct");
      assert.equal(spenderBalance.toNumber(), 0, "the balance is correct");
      assert.equal(recipientBalance.toNumber(), 0, "the balance is correct");
      assert.equal(version, 'v1', 'the contract version is correct');

      let cst2Impl = await Token_v2.new({ gas: CST_DEPLOY_GAS_LIMIT });
      await proxy.upgradeTo(cst2Impl.address, { from: proxyAdmin });
      let cst2 = await Token_v2.at(proxy.address);

      allowance = await cst2.allowance(grantor, spender);
      grantorBalance = await cst2.balanceOf(grantor);
      spenderBalance = await cst2.balanceOf(spender);
      recipientBalance = await cst2.balanceOf(recipient);
      version = await cst2.getVersion();

      assert.equal(version, 'v2', 'the contract version is correct');
      assert.equal(allowance, web3.toWei(10, 'ether'), "the allowance is correct");
      assert.equal(grantorBalance, web3.toWei(50, 'ether'), "the balance is correct");
      assert.equal(spenderBalance, 0, "the balance is correct");
      assert.equal(recipientBalance, 0, "the balance is correct");

      await cst2.transferFrom(grantor, recipient, web3.toWei(10, 'ether'), { from: spender });

      allowance = await cst2.allowance(grantor, spender);
      grantorBalance = await cst2.balanceOf(grantor);
      spenderBalance = await cst2.balanceOf(spender);
      recipientBalance = await cst2.balanceOf(recipient);

      assert.equal(allowance.toNumber(), 0, "the allowance is correct");
      assert.equal(grantorBalance, web3.toWei(40, 'ether'), "the balance is correct");
      assert.equal(spenderBalance, 0, "the balance is correct");
      assert.equal(recipientBalance, web3.toWei(10, 'ether'), "the balance is correct");
    });
  });
});

