pragma solidity ^0.4.13;

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
  uint256 public buyPrice;
  uint256 public sellCap;
  address public foundation;

  // Note that the data for the buyer whitelist itenationally lives in this contract
  // and not in storage, as this whitelist is specific to phase 1 token sale
  uint256 public cstBuyerPool;
  uint256 public cstBalanceLimit;
  uint256 public contributionMinimum;
  uint256 priceChangeBlockHeight;

  uint256 public totalCustomBuyersMapping;
  mapping (address => uint256) public customBuyerLimit;
  mapping (uint256 => address) public customBuyerForIndex;
  mapping (address => bool) processedCustomBuyer;

  uint256 public totalBuyersMapping;
  mapping (address => bool) public approvedBuyer;
  mapping (uint256 => address) public approvedBuyerForIndex;
  mapping (address => bool) processedBuyer;

  uint256 public decimals = 0;
  bool public allowTransfers;

  event SellCapChange(uint256 newSellCap);
  event PriceChange(uint256 newSellPrice, uint256 newBuyPrice);
  event Mint(uint256 amountMinted, uint256 totalTokens, uint256 sellCap);
  event Approval(address indexed _owner,
                 address indexed _spender,
                 uint256 _value);
  event Transfer(address indexed _from,
                 address indexed _to,
                 uint256 _value);
  event WhiteList(address indexed buyer, uint256 holdCap);

  modifier onlyFoundation {
    if (msg.sender != owner && msg.sender != foundation) revert();
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
    revert();     // Prevents accidental sending of ether
  }

  function getLedgerNameHash() constant returns (bytes32) {
    return sha3(ledgerName);
  }

  function getStorageNameHash() constant returns (bytes32) {
    return sha3(storageName);
  }

  function configure(bytes32 _tokenName,
                     bytes32 _tokenSymbol,
                     uint256 _buyPrice,
                     uint256 _sellCap,
                     uint256 _buyerPool,
                     uint256 _balanceLimit,
                     address _foundation) onlySuperAdmins unlessUpgraded initStorage returns (bool) {

    externalStorage.setTokenName(_tokenName);
    externalStorage.setTokenSymbol(_tokenSymbol);
    externalStorage.setBuyPrice(_buyPrice);
    externalStorage.setSellCap(_sellCap);
    externalStorage.setFoundation(_foundation);

    if (buyPrice > 0 && buyPrice != _buyPrice) {
      priceChangeBlockHeight = block.number;
    }

    buyPrice = _buyPrice;
    sellCap = _sellCap;
    foundation = _foundation;

    cstBuyerPool = _buyerPool;
    cstBalanceLimit = _balanceLimit;

    return true;
  }

  function configureFromStorage() onlySuperAdmins unlessUpgraded initStorage returns (bool) {
    buyPrice = externalStorage.getBuyPrice();
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

  function totalInCirculation() constant unlessFrozen unlessUpgraded returns(uint256) {
    return tokenLedger.totalInCirculation();
  }

  function totalSupply() constant unlessFrozen unlessUpgraded returns(uint256) {
    return tokenLedger.totalTokens();
  }

  function balanceOf(address account) constant unlessUpgraded unlessFrozen returns (uint256) {
    address thisAddress = this;
    if (thisAddress == account) {
      return tokenLedger.tokensAvailable();
    } else {
      return tokenLedger.balanceOf(account);
    }
  }

  function transfer(address recipient, uint256 amount) unlessFrozen unlessUpgraded returns (bool) {
    require(allowTransfers);
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    Transfer(msg.sender, recipient, amount);

    return true;
  }

  function mintTokens(uint256 mintedAmount) onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    tokenLedger.mintTokens(mintedAmount);
    Mint(mintedAmount, tokenLedger.totalTokens(), sellCap);

    return true;
  }

  function grantTokens(address recipient, uint256 amount) onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    require(amount <= tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation()));           // make sure there are enough tokens to grant

    tokenLedger.debitAccount(recipient, amount);
    Transfer(this, recipient, amount);

    return true;
  }

  function buy() payable unlessFrozen unlessUpgraded returns (uint256) {
    require(msg.value >= buyPrice);
    require(approvedBuyer[msg.sender]);
    assert(priceChangeBlockHeight == 0 || block.number > priceChangeBlockHeight.add(1));
    assert(buyPrice > 0);

    uint256 amount = msg.value.div(buyPrice);
    uint256 tokensAvailable = tokenLedger.tokensAvailable();
    assert(tokenLedger.totalInCirculation().add(amount) <= sellCap);
    assert(amount <= tokensAvailable);

    uint256 balanceLimit;
    uint256 buyerBalance = tokenLedger.balanceOf(msg.sender);
    uint256 customLimit = customBuyerLimit[msg.sender];
    require(contributionMinimum == 0 || buyerBalance >= contributionMinimum || amount >= contributionMinimum);

    if (customLimit > 0) {
      balanceLimit = customLimit;
    } else {
      balanceLimit = cstBalanceLimit;
    }

    assert(balanceLimit > 0 && balanceLimit >= buyerBalance.add(amount));

    tokenLedger.debitAccount(msg.sender, amount);
    Transfer(this, msg.sender, amount);

    return amount;
  }

  function foundationWithdraw(uint256 amount) onlyFoundation returns (bool) {
    /* UNTRUSTED */
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
    require(allowTransfers);
    require(!frozenAccount[from]);
    require(!frozenAccount[to]);
    require(from != msg.sender);
    require(value > 0);

    uint256 allowanceValue = allowance(from, msg.sender);
    require(allowanceValue >= value);

    tokenLedger.transfer(from, to, value);
    externalStorage.setAllowance(from, msg.sender, allowanceValue.sub(value));

    Transfer(from, to, value);
    return true;
  }

  function approve(address spender, uint256 value) unlessFrozen unlessUpgraded returns (bool) {
    require(!frozenAccount[spender]);
    require(msg.sender != spender);

    externalStorage.setAllowance(msg.sender, spender, value);

    Approval(msg.sender, spender, value);
    return true;
  }

  function setCustomBuyer(address buyer, uint256 balanceLimit) onlySuperAdmins unlessUpgraded returns (bool) {
    customBuyerLimit[buyer] = balanceLimit;
    if (!processedCustomBuyer[buyer]) {
      processedCustomBuyer[buyer] = true;
      customBuyerForIndex[totalCustomBuyersMapping] = buyer;
      totalCustomBuyersMapping = totalCustomBuyersMapping.add(1);
    }
    addBuyer(buyer);

    return true;
  }

  function setAllowTransfers(bool _allowTransfers) onlySuperAdmins unlessUpgraded returns (bool) {
    allowTransfers = _allowTransfers;
    return true;
  }

  function setContributionMinimum(uint256 _contributionMinimum) onlySuperAdmins unlessUpgraded returns (bool) {
    contributionMinimum = _contributionMinimum;
    return true;
  }

  function addBuyer(address buyer) onlySuperAdmins unlessUpgraded returns (bool) {
    approvedBuyer[buyer] = true;
    if (!processedBuyer[buyer]) {
      processedBuyer[buyer] = true;
      approvedBuyerForIndex[totalBuyersMapping] = buyer;
      totalBuyersMapping = totalBuyersMapping.add(1);
    }

    uint256 balanceLimit = customBuyerLimit[buyer];
    if (balanceLimit == 0) {
      balanceLimit = cstBalanceLimit;
    }

    WhiteList(buyer, balanceLimit);

    return true;
  }

  function removeBuyer(address buyer) onlySuperAdmins unlessUpgraded returns (bool) {
    approvedBuyer[buyer] = false;

    return true;
  }
}
