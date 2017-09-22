pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./freezable.sol";
import "./CstLedger.sol";
import "./ExternalStorage.sol";
import "./Registry.sol";
import "./CstLibrary.sol";
import "./displayable.sol";
import "./upgradeable.sol";
import "./configurable.sol";
import "./storable.sol";

contract CardStackToken is Ownable,
                           freezable,
                           displayable,
                           upgradeable,
                           configurable,
                           storable {

  using SafeMath for uint256;
  using CstLibrary for address;

  string public storageName;
  string public ledgerName;
  ITokenLedger public tokenLedger;
  address public externalStorage;
  address public registry;

  // These are mirrored in external storage so that state can live in future version of this contract
  // we save on gas prices by having these available as instance variables
  uint public sellPrice;
  uint public buyPrice;
  uint public sellCap;
  address public foundation;

  // Note that the data for the buyer whitelist itenationally lives in this contract
  // and not in storage, as this whitelist is specific to phase 1 token sale
  uint public cstBuyerPool;
  uint public cstBalanceLimitPercent6SigDigits; // 100% = 1000000, 1% = 10000, 0.1% = 1000, 0.01% = 100, etc.

  uint public totalCustomBuyers;
  mapping (address => uint) public customBuyerLimit; // 6 significant digits
  mapping (uint => address) public customBuyerForIndex;
  mapping (address => bool) processedCustomBuyer;

  uint public totalBuyers;
  mapping (address => bool) public approvedBuyer;
  mapping (uint => address) public approvedBuyerForIndex;
  mapping (address => bool) processedBuyer;

  uint public decimals = 0;

  event SellCapChange(uint newSellCap);
  event PriceChange(uint newSellPrice, uint newBuyPrice);
  event Mint(uint amountMinted, uint totalTokens, uint sellCap);
  event Approval(address indexed _owner,
                 address indexed _spender,
                 uint256 _value);
  event Transfer(address indexed _from,
                 address indexed _to,
                 uint _value);

  modifier onlyFoundation {
    if (msg.sender != owner && msg.sender != foundation) throw;
    _;
  }

  modifier initStorage {
    address ledgerAddress = Registry(registry).getStorage(ledgerName);
    address storageAddress = Registry(registry).getStorage(storageName);

    tokenLedger = ITokenLedger(ledgerAddress);
    externalStorage = storageAddress;
    _;
  }

  function CardStackToken(address _registry, string _storageName, string _ledgerName) payable {
    storageName = _storageName;
    ledgerName = _ledgerName;
    registry = _registry;

    addSuperAdmin(registry);
  }

  /* This unnamed function is called whenever someone tries to send ether to it */
  function () {
    throw;     // Prevents accidental sending of ether
  }

  function getLedgerNameHash() constant returns (bytes32) {
    return sha3(ledgerName);
  }

  function getStorageNameHash() constant returns (bytes32) {
    return sha3(storageName);
  }

  function configure(bytes32 _tokenName,
                     bytes32 _tokenSymbol,
                     uint _buyPrice,
                     uint _sellPrice,
                     uint _sellCap,
                     uint _buyerPool,
                     uint _balanceLimit,
                     address _foundation) onlySuperAdmins unlessUpgraded initStorage returns (bool) {

    externalStorage.setTokenName(_tokenName);
    externalStorage.setTokenSymbol(_tokenSymbol);
    externalStorage.setBuyPrice(_buyPrice);
    externalStorage.setSellPrice(_sellPrice);
    externalStorage.setSellCap(_sellCap);
    externalStorage.setFoundation(_foundation);

    sellPrice = _sellPrice;
    buyPrice = _buyPrice;
    sellCap = _sellCap;
    foundation = _foundation;

    cstBuyerPool = _buyerPool;
    cstBalanceLimitPercent6SigDigits = _balanceLimit;

    return true;
  }

  function configureFromStorage() onlySuperAdmins unlessUpgraded initStorage returns (bool) {
    buyPrice = externalStorage.getBuyPrice();
    sellPrice = externalStorage.getSellPrice();
    sellCap = externalStorage.getSellCap();
    foundation = externalStorage.getFoundation();

    return true;
  }

  function updateStorage(string newStorageName, string newLedgerName) onlySuperAdmins unlessUpgraded returns (bool) {
    storageName = newStorageName;
    ledgerName = newLedgerName;

    configureFromStorage();

    return true;
  }

  function name() constant unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenName());
  }

  function symbol() constant unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenSymbol());
  }

  function totalInCirculation() constant unlessFrozen unlessUpgraded returns(uint) {
    return tokenLedger.totalInCirculation();
  }

  function totalSupply() constant unlessFrozen unlessUpgraded returns(uint) {
    return tokenLedger.totalTokens();
  }

  function balanceOf(address account) constant unlessUpgraded unlessFrozen returns (uint) {
    address thisAddress = this;
    if (thisAddress == account) {
      return tokenLedger.tokensAvailable();
    } else {
      return tokenLedger.balanceOf(account);
    }
  }

  function transfer(address recipient, uint amount) unlessFrozen unlessUpgraded returns (bool) {
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    Transfer(msg.sender, recipient, amount);

    return true;
  }

  function mintTokens(uint mintedAmount) onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    tokenLedger.mintTokens(mintedAmount);
    Mint(mintedAmount, tokenLedger.totalTokens(), sellCap);

    return true;
  }

  function grantTokens(address recipient, uint amount) onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    require(amount <= tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation()));           // make sure there are enough tokens to grant

    tokenLedger.debitAccount(recipient, amount);
    Transfer(this, recipient, amount);

    return true;
  }

  function buy() payable unlessFrozen unlessUpgraded returns (uint) {
    require(msg.value >= buyPrice);
    require(approvedBuyer[msg.sender]);
    assert(buyPrice > 0);

    uint amount = msg.value.div(buyPrice);
    uint supply = tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation());
    assert(tokenLedger.totalInCirculation().add(amount) <= sellCap);
    assert(amount <= supply);

    uint balanceLimit;
    uint buyerBalance = tokenLedger.balanceOf(msg.sender);
    uint customLimit = customBuyerLimit[msg.sender];

    if (customLimit > 0) {
      balanceLimit = cstBuyerPool.mul(customLimit).div(1000000);
    } else {
      balanceLimit = cstBuyerPool.mul(cstBalanceLimitPercent6SigDigits).div(1000000);
    }

    assert(balanceLimit >= buyerBalance.add(amount));

    tokenLedger.debitAccount(msg.sender, amount);
    Transfer(this, msg.sender, amount);

    return amount;
  }

  function foundationWithdraw(uint amount) onlyFoundation returns (bool) {
    msg.sender.transfer(amount);

    return true;
  }

  // intentionally did not lock this down to foundation only. if someone wants to send ethers, no biggie0:w
  function foundationDeposit() payable unlessUpgraded returns (bool) {
    return true;
  }

  function allowance(address owner, address spender) constant unlessUpgraded returns (uint256) {
    return externalStorage.getAllowance(owner, spender);
  }

  function transferFrom(address from, address to, uint256 value) unlessFrozen unlessUpgraded returns (bool) {
    require(!frozenAccount[from]);
    require(!frozenAccount[to]);

    uint allowanceValue = allowance(from, msg.sender);
    require(allowanceValue >= value);

    tokenLedger.transfer(from, to, value);
    externalStorage.setAllowance(from, msg.sender, allowanceValue.sub(value));

    Transfer(from, to, value);
    return true;
  }

  function approve(address spender, uint256 value) unlessFrozen unlessUpgraded returns (bool) {
    require(!frozenAccount[spender]);

    externalStorage.setAllowance(msg.sender, spender, value);

    Approval(msg.sender, spender, value);
    return true;
  }

  function setCustomBuyer(address buyer, uint buyerLimitPercentage6SigDigits) onlySuperAdmins unlessUpgraded returns (bool) {
    customBuyerLimit[buyer] = buyerLimitPercentage6SigDigits;
    if (!processedCustomBuyer[buyer]) {
      processedCustomBuyer[buyer] = true;
      customBuyerForIndex[totalCustomBuyers] = buyer;
      totalCustomBuyers = totalCustomBuyers.add(1);
    }
    addBuyer(buyer);

    return true;
  }

  function addBuyer(address buyer) onlySuperAdmins unlessUpgraded returns (bool) {
    approvedBuyer[buyer] = true;
    if (!processedBuyer[buyer]) {
      processedBuyer[buyer] = true;
      approvedBuyerForIndex[totalBuyers] = buyer;
      totalBuyers = totalBuyers.add(1);
    }

    return true;
  }

  function removeBuyer(address buyer) onlySuperAdmins unlessUpgraded returns (bool) {
    approvedBuyer[buyer] = false;

    return true;
  }
}
