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
import "./initializable.sol";
import "./startable.sol";
import "./storable.sol";
import "./IRewards.sol";

// TODO add additional ERC20 Token standard functions for approving spends on your behalf and setting an allowance
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/StandardToken.sol

contract CardStackToken is Ownable,
                           freezable,
                           displayable,
                           upgradeable,
                           initializable,
                           startable,
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
  uint public minimumBalance;
  address public foundation;

  event SellCapChange(uint newSellCap);
  event PriceChange(uint newSellPrice, uint newBuyPrice);
  event Grant(address indexed recipient, address recipientAccount, uint value);
  event Mint(uint amountMinted, uint totalTokens, uint sellCap);
  event Buy(address indexed buyer, address buyerAccount, uint value, uint purchasePrice);
  event Sell(address indexed seller, address sellerAccount, uint value, uint sellPrice);
  event Approval(address indexed grantor,
                 address grantorAccount,
                 address indexed spender,
                 address spenderAccount,
                 uint256 value);
  event Transfer(address indexed sender,
                 address senderAccount,
                 address indexed recipient,
                 address recipientAccount,
                 uint value);

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

  modifier triggersRewards() {
    _;

    address rewards = rewardsContract();
    if (rewards != 0x0) {
      IRewards(rewards).processRewards();
    }
  }

  function CardStackToken(address _registry, string _storageName, string _ledgerName) payable {
    frozenToken = true;

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

  function initialize(bytes32 _tokenName,
                      bytes32 _tokenSymbol,
                      uint _buyPrice,
                      uint _sellPrice,
                      uint _sellCap,
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

    frozenToken = false;

    return true;
  }

  function initializeFromStorage() onlySuperAdmins unlessUpgraded initStorage returns (bool) {
    buyPrice = externalStorage.getBuyPrice();
    sellPrice = externalStorage.getSellPrice();
    sellCap = externalStorage.getSellCap();
    minimumBalance = externalStorage.getMinimumBalance();
    foundation = externalStorage.getFoundation();

    return true;
  }

  function start() onlySuperAdmins unlessUpgraded returns (bool) {
    frozenToken = false;

    return true;
  }

  function updateStorage(string newStorageName, string newLedgerName) onlySuperAdmins unlessUpgraded returns (bool) {
    storageName = newStorageName;
    ledgerName = newLedgerName;

    initializeFromStorage();

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

  function totalTokens() constant unlessFrozen unlessUpgraded returns(uint) {
    return tokenLedger.totalTokens();
  }

  function balanceOf(address account) constant unlessUpgraded unlessFrozen returns (uint) {
    return tokenLedger.balanceOf(account);
  }

  function transfer(address recipient, uint amount) unlessFrozen unlessUpgraded triggersRewards returns (bool) {
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    Transfer(msg.sender, msg.sender, recipient, recipient, amount);

    return true;
  }

  function mintTokens(uint mintedAmount) onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    tokenLedger.mintTokens(mintedAmount);
    Mint(mintedAmount, tokenLedger.totalTokens(), sellCap);

    return true;
  }

  function grantTokens(address recipient, uint amount) onlySuperAdmins unlessFrozen unlessUpgraded triggersRewards returns (bool) {
    require(amount <= tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation()));           // make sure there are enough tokens to grant

    tokenLedger.debitAccount(recipient, amount);
    Grant(recipient, recipient, amount);

    return true;
  }

  function setPrices(uint newSellPrice, uint newBuyPrice) onlySuperAdmins unlessUpgraded returns (bool) {
    require(newSellPrice > 0);
    require(newBuyPrice > 0);

    sellPrice = newSellPrice;
    buyPrice = newBuyPrice;

    externalStorage.setBuyPrice(newBuyPrice);
    externalStorage.setSellPrice(newSellPrice);

    PriceChange(newSellPrice, newBuyPrice);

    return true;
  }

  function setSellCap(uint newSellCap) onlySuperAdmins unlessUpgraded returns (bool) {
    sellCap = newSellCap;
    externalStorage.setSellCap(newSellCap);

    SellCapChange(newSellCap);

    return true;
  }

  function setMinimumBalance(uint newMinimumBalance) onlySuperAdmins  returns (bool) {
    minimumBalance = newMinimumBalance;

    externalStorage.setMinimumBalance(newMinimumBalance);

    return true;
  }

  function cstAvailableToBuy() constant unlessUpgraded returns (bool) {
    return sellCap > tokenLedger.totalInCirculation();
  }

  function buy() payable unlessFrozen unlessUpgraded triggersRewards returns (uint) {
    require(msg.value >= buyPrice);
    assert(buyPrice > 0);

    uint amount = msg.value.div(buyPrice);
    uint supply = tokenLedger.totalTokens().sub(tokenLedger.totalInCirculation());
    assert(tokenLedger.totalInCirculation().add(amount) <= sellCap);
    assert(amount <= supply);

    tokenLedger.debitAccount(msg.sender, amount);
    Buy(msg.sender, msg.sender, amount, msg.value);

    return amount;
  }

  function setFoundation(address _foundation) onlySuperAdmins unlessUpgraded returns (bool) {
    foundation = _foundation;
  }

  function foundationWithdraw(uint amount) onlyFoundation returns (bool) {
    require(amount <= this.balance.sub(minimumBalance));

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

  function transferFrom(address from, address to, uint256 value) unlessFrozen unlessUpgraded triggersRewards returns (bool) {
    require(!frozenAccount[from]);
    require(!frozenAccount[to]);

    uint allowanceValue = allowance(from, msg.sender);
    require(allowanceValue >= value);

    tokenLedger.transfer(from, to, value);
    externalStorage.setAllowance(from, msg.sender, allowanceValue.sub(value));

    Transfer(from, from, to, to, value);
    return true;
  }

  function approve(address spender, uint256 value) unlessFrozen unlessUpgraded returns (bool) {
    require(!frozenAccount[spender]);

    externalStorage.setAllowance(msg.sender, spender, value);

    Approval(msg.sender, msg.sender, spender, spender, value);
    return true;
  }

  function setRewardsContractName(string rewardsContractName) onlySuperAdmins unlessUpgraded returns (bool) {
    externalStorage.setRewardsContractHash(sha3(rewardsContractName));
    return true;
  }

  function rewardsContract() constant unlessUpgraded returns (address) {
    bytes32 hash = externalStorage.getRewardsContractHash();

    return Registry(registry).contractForHash(hash);
  }
}
