pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "zos-lib/contracts/migrations/Initializable.sol";
import "./ERC20.sol";
import "./Freezable.sol";
import "./ITokenLedger.sol";
import "./ExternalStorage.sol";
import "./Registry.sol";
import "./CstLibrary.sol";
import "./Displayable.sol";
import "./Configurable.sol";
import "./IStorable.sol";

contract CardstackToken is ERC20,
                           Initializable,
                           Freezable,
                           Displayable,
                           Configurable,
                           IStorable {

  using SafeMath for uint256;
  using CstLibrary for address;

  /* zOS requires that the variables are never removed nor order changed
  /* BEGIN VARIABLES */
  uint8 public constant decimals = 18;
  string public constant version = "3";
  uint256 public constant tokenMaxCap = 6000000000000000000000000000; // 6 billion * 10^18

  ITokenLedger public tokenLedger;
  string public storageName;
  string public ledgerName;
  address public externalStorage;
  address public registry;
  bool public haltPurchase;
  uint256 public contributionMinimum;
  /* END VARIABLES */

  event Mint(uint256 amountMinted);
  event Approval(address indexed _owner,
                 address indexed _spender,
                 uint256 _value);
  event Transfer(address indexed _from,
                 address indexed _to,
                 uint256 _value);
  event WhiteList(address indexed buyer, uint256 holdCap);
  event RemoveWhitelistedBuyer(address indexed buyer);
  event ConfigChanged(uint256 buyPrice, uint256 circulationCap, uint256 balanceLimit);
  event VestedTokenGrant(address indexed beneficiary, uint256 startDate, uint256 cliffDate, uint256 durationSec, uint256 fullyVestedAmount, bool isRevocable);
  event VestedTokenRevocation(address indexed beneficiary);
  event VestedTokenRelease(address indexed beneficiary, uint256 amount);
  event StorageUpdated(address storageAddress, address ledgerAddress);
  event FoundationDeposit(uint256 amount);
  event FoundationWithdraw(uint256 amount);
  event PurchaseHalted();
  event PurchaseResumed();

  modifier onlyFoundation {
    address foundation = externalStorage.getFoundation();
    require(foundation != address(0));
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

  function buy() external payable unlessFrozen returns (uint256) {
    require(!haltPurchase);
    require(externalStorage.getApprovedBuyer(msg.sender));

    uint256 _buyPriceTokensPerWei = externalStorage.getBuyPrice();
    uint256 _circulationCap = externalStorage.getCirculationCap();
    require(msg.value > 0);
    require(_buyPriceTokensPerWei > 0);
    require(_circulationCap > 0);

    uint256 amount = msg.value.mul(_buyPriceTokensPerWei);
    require(totalInCirculation().add(amount) <= _circulationCap);
    require(amount <= tokensAvailable());

    uint256 balanceLimit;
    uint256 buyerBalance = tokenLedger.balanceOf(msg.sender);
    uint256 customLimit = externalStorage.getCustomBuyerLimit(msg.sender);
    require(contributionMinimum == 0 || buyerBalance.add(amount) >= contributionMinimum);

    if (customLimit > 0) {
      balanceLimit = customLimit;
    } else {
      balanceLimit = externalStorage.getBalanceLimit();
    }

    require(balanceLimit > 0 && balanceLimit >= buyerBalance.add(amount));

    tokenLedger.debitAccount(msg.sender, amount);
    emit Transfer(this, msg.sender, amount);

    return amount;
  }

  function getLedgerNameHash() external view returns (bytes32) {
    return keccak256(abi.encodePacked(ledgerName));
  }

  function getStorageNameHash() external view returns (bytes32) {
    return keccak256(abi.encodePacked(storageName));
  }

  function initialize(address _registry, string _storageName, string _ledgerName) public onlyInitializers {
    initializeAdmins();
    _initialize(_registry, _storageName, _ledgerName);
  }

  function configure(bytes32 _tokenName,
                     bytes32 _tokenSymbol,
                     uint256 _buyPrice,
                     uint256 _circulationCap,
                     uint256 _balanceLimit,
                     address _foundation) public onlySuperAdmins initStorage returns (bool) {

    uint256 __buyPrice = externalStorage.getBuyPrice();
    if (__buyPrice > 0 && __buyPrice != _buyPrice) {
      require(frozenToken);
    }

    externalStorage.setTokenName(_tokenName);
    externalStorage.setTokenSymbol(_tokenSymbol);
    externalStorage.setBuyPrice(_buyPrice);
    externalStorage.setCirculationCap(_circulationCap);
    externalStorage.setFoundation(_foundation);
    externalStorage.setBalanceLimit(_balanceLimit);

    emit ConfigChanged(_buyPrice, _circulationCap, _balanceLimit);

    return true;
  }

  function configureFromStorage() public onlySuperAdmins initStorage returns (bool) {
    freezeToken(true);
    return true;
  }

  function updateStorage(string newStorageName, string newLedgerName) public onlySuperAdmins returns (bool) {
    require(frozenToken);

    storageName = newStorageName;
    ledgerName = newLedgerName;

    configureFromStorage();

    address ledgerAddress = Registry(registry).getStorage(ledgerName);
    address storageAddress = Registry(registry).getStorage(storageName);
    emit StorageUpdated(storageAddress, ledgerAddress);
    return true;
  }

  function transfer(address recipient, uint256 amount) public unlessFrozen returns (bool) {
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    emit Transfer(msg.sender, recipient, amount);

    return true;
  }

  function mintTokens(uint256 mintedAmount) public onlySuperAdmins returns (bool) {
    require(mintedAmount.add(totalSupply()) <= tokenMaxCap);
    require(mintedAmount > 0);

    tokenLedger.mintTokens(mintedAmount);

    emit Mint(mintedAmount);
    emit Transfer(address(0), this, mintedAmount);

    return true;
  }

  function grantTokens(address recipient, uint256 amount) public onlySuperAdmins returns (bool) {
    require(haltPurchase);
    require(!frozenAccount[recipient]);

    uint256 _circulationCap = externalStorage.getCirculationCap();
    require(totalInCirculation().add(amount) <= _circulationCap);
    require(amount <= tokensAvailable()); // assert the granted tokens doesnt exceed the totalSupply minus the fully vested amount of vesting tokens

    tokenLedger.debitAccount(recipient, amount);
    emit Transfer(this, recipient, amount);

    return true;
  }

  function setHaltPurchase(bool _haltPurchase) public onlySuperAdmins returns (bool) {
    haltPurchase = _haltPurchase;

    if (_haltPurchase) {
      emit PurchaseHalted();
    } else {
      emit PurchaseResumed();
    }
    return true;
  }

  // intentionally allowing this to work when token is frozen as foundation is a form of a super admin
  function foundationWithdraw(uint256 amount) public onlyFoundation returns (bool) {
    /* UNTRUSTED */
    msg.sender.transfer(amount);

    emit FoundationWithdraw(amount);
    return true;
  }

  function foundationDeposit() public payable unlessFrozen returns (bool) {
    emit FoundationDeposit(msg.value);

    return true;
  }

  function transferFrom(address from, address to, uint256 value) public unlessFrozen returns (bool) {
    require(!frozenAccount[from]);
    require(!frozenAccount[to]);
    require(from != msg.sender);

    uint256 allowanceValue = allowance(from, msg.sender);
    require(allowanceValue >= value);

    tokenLedger.transfer(from, to, value);
    externalStorage.setAllowance(from, msg.sender, allowanceValue.sub(value));

    emit Transfer(from, to, value);
    return true;
  }

  /* Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   *
   * Please use `increaseApproval` or `decreaseApproval` instead.
   */
  function approve(address spender, uint256 value) public unlessFrozen returns (bool) {
    require(value == 0 || allowance(msg.sender, spender) == 0);

    return _approve(spender, value);
  }

  function increaseApproval(address spender, uint256 addedValue) public unlessFrozen returns (bool) {
    return _approve(spender, externalStorage.getAllowance(msg.sender, spender).add(addedValue));
  }

  function decreaseApproval(address spender, uint256 subtractedValue) public unlessFrozen returns (bool) {
    uint256 oldValue = externalStorage.getAllowance(msg.sender, spender);

    if (subtractedValue > oldValue) {
      return _approve(spender, 0);
    } else {
      return _approve(spender, oldValue.sub(subtractedValue));
    }
  }

  function grantVestedTokens(address beneficiary,
                             uint256 fullyVestedAmount,
                             uint256 startDate, // 0 indicates start "now"
                             uint256 cliffSec,
                             uint256 durationSec,
                             bool isRevocable) public onlySuperAdmins returns(bool) {

    uint256 _circulationCap = externalStorage.getCirculationCap();

    require(beneficiary != address(0));
    require(!frozenAccount[beneficiary]);
    require(durationSec >= cliffSec);
    require(totalInCirculation().add(fullyVestedAmount) <= _circulationCap);
    require(fullyVestedAmount <= tokensAvailable());

    uint256 _startDate = startDate;
    if (_startDate == 0) {
      _startDate = now;
    }

    uint256 cliffDate = _startDate.add(cliffSec);

    externalStorage.setVestingSchedule(beneficiary,
                                       fullyVestedAmount,
                                       _startDate,
                                       cliffDate,
                                       durationSec,
                                       isRevocable);

    emit VestedTokenGrant(beneficiary, _startDate, cliffDate, durationSec, fullyVestedAmount, isRevocable);

    return true;
  }

  function revokeVesting(address beneficiary) public onlySuperAdmins returns (bool) {
    require(beneficiary != address(0));
    externalStorage.revokeVesting(beneficiary);

    releaseVestedTokensForBeneficiary(beneficiary);

    emit VestedTokenRevocation(beneficiary);

    return true;
  }

  function releaseVestedTokens() public unlessFrozen returns (bool) {
    return releaseVestedTokensForBeneficiary(msg.sender);
  }

  function releaseVestedTokensForBeneficiary(address beneficiary) public unlessFrozen returns (bool) {
    require(beneficiary != address(0));
    require(!frozenAccount[beneficiary]);

    uint256 unreleased = releasableAmount(beneficiary);

    if (unreleased == 0) { return true; }

    externalStorage.releaseVestedTokens(beneficiary);

    tokenLedger.debitAccount(beneficiary, unreleased);
    emit Transfer(this, beneficiary, unreleased);

    emit VestedTokenRelease(beneficiary, unreleased);

    return true;
  }

  function setCustomBuyer(address buyer, uint256 balanceLimit) public onlySuperAdmins returns (bool) {
    require(buyer != address(0));
    externalStorage.setCustomBuyerLimit(buyer, balanceLimit);
    addBuyer(buyer);

    return true;
  }

  function setContributionMinimum(uint256 _contributionMinimum) public onlySuperAdmins returns (bool) {
    contributionMinimum = _contributionMinimum;
    return true;
  }

  function addBuyer(address buyer) public onlySuperAdmins returns (bool) {
    require(buyer != address(0));
    externalStorage.setApprovedBuyer(buyer, true);

    uint256 balanceLimit = externalStorage.getCustomBuyerLimit(buyer);
    if (balanceLimit == 0) {
      balanceLimit = externalStorage.getBalanceLimit();
    }

    emit WhiteList(buyer, balanceLimit);

    return true;
  }

  function removeBuyer(address buyer) public onlySuperAdmins returns (bool) {
    require(buyer != address(0));
    externalStorage.setApprovedBuyer(buyer, false);

    emit RemoveWhitelistedBuyer(buyer);
    return true;
  }

  function name() public view returns(string) {
    return bytes32ToString(externalStorage.getTokenName());
  }

  function symbol() public view returns(string) {
    return bytes32ToString(externalStorage.getTokenSymbol());
  }

  function totalInCirculation() public view returns(uint256) {
    return tokenLedger.totalInCirculation().add(totalUnvestedAndUnreleasedTokens());
  }

  function cstBalanceLimit() public view returns(uint256) {
    return externalStorage.getBalanceLimit();
  }

  function buyPrice() public view returns(uint256) {
    return externalStorage.getBuyPrice();
  }

  function circulationCap() public view returns(uint256) {
    return externalStorage.getCirculationCap();
  }

  // intentionally allowing this to be visible if upgraded so foundation can
  // withdraw funds from contract that has a successor
  function foundation() public view returns(address) {
    return externalStorage.getFoundation();
  }

  function totalSupply() public view returns(uint256) {
    return tokenLedger.totalTokens();
  }

  function tokensAvailable() public view returns(uint256) {
    return totalSupply().sub(totalInCirculation());
  }

  function balanceOf(address account) public view returns (uint256) {
    address thisAddress = this;
    if (thisAddress == account) {
      return tokensAvailable();
    } else {
      return tokenLedger.balanceOf(account);
    }
  }

  function allowance(address _owner, address _spender) public view returns (uint256) {
    return externalStorage.getAllowance(_owner, _spender);
  }

  function releasableAmount(address beneficiary) public view returns (uint256) {
    return externalStorage.releasableAmount(beneficiary);
  }

  function totalUnvestedAndUnreleasedTokens() public view returns (uint256) {
    return externalStorage.getTotalUnvestedAndUnreleasedTokens();
  }

  function vestingMappingSize() public view returns (uint256) {
    return externalStorage.vestingMappingSize();
  }

  function vestingBeneficiaryForIndex(uint256 index) public view returns (address) {
    return externalStorage.vestingBeneficiaryForIndex(index);
  }

  function vestingSchedule(address _beneficiary) public
                                                 view returns (uint256 startDate,
                                                               uint256 cliffDate,
                                                               uint256 durationSec,
                                                               uint256 fullyVestedAmount,
                                                               uint256 vestedAmount,
                                                               uint256 vestedAvailableAmount,
                                                               uint256 releasedAmount,
                                                               uint256 revokeDate,
                                                               bool isRevocable) {
    (
      startDate,
      cliffDate,
      durationSec,
      fullyVestedAmount,
      releasedAmount,
      revokeDate,
      isRevocable
    ) =  externalStorage.getVestingSchedule(_beneficiary);

    vestedAmount = externalStorage.vestedAmount(_beneficiary);
    vestedAvailableAmount = externalStorage.vestedAvailableAmount(_beneficiary);
  }

  function totalCustomBuyersMapping() public view returns (uint256) {
    return externalStorage.getCustomBuyerMappingCount();
  }

  function customBuyerLimit(address buyer) public view returns (uint256) {
    return externalStorage.getCustomBuyerLimit(buyer);
  }

  function customBuyerForIndex(uint256 index) public view returns (address) {
    return externalStorage.getCustomBuyerForIndex(index);
  }

  function totalBuyersMapping() public view returns (uint256) {
    return externalStorage.getApprovedBuyerMappingCount();
  }

  function approvedBuyer(address buyer) public view returns (bool) {
    return externalStorage.getApprovedBuyer(buyer);
  }

  function approvedBuyerForIndex(uint256 index) public view returns (address) {
    return externalStorage.getApprovedBuyerForIndex(index);
  }

  function _initialize(address _registry, string _storageName, string _ledgerName) internal isInitializer {
    require(_registry != address(0));

    storageName = _storageName;
    ledgerName = _ledgerName;
    registry = _registry;

    addSuperAdmin(registry);

    emit Transfer(address(0), this, 0); // create ERC-20 signature for etherscan.io
  }

  function _approve(address spender, uint256 value) internal unlessFrozen returns(bool) {
    require(spender != address(0));
    require(!frozenAccount[spender]);
    require(msg.sender != spender);

    externalStorage.setAllowance(msg.sender, spender, value);

    emit Approval(msg.sender, spender, value);
    return true;
  }

}
