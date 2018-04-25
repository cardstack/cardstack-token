pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./ERC20.sol";
import "./freezable.sol";
import "./CstLedger.sol";
import "./ExternalStorage.sol";
import "./Registry.sol";
import "./CstLibrary.sol";
import "./displayable.sol";
import "./upgradeable.sol";
import "./configurable.sol";
import "./storable.sol";

contract CardStackToken is ERC20,
                           Ownable,
                           freezable,
                           displayable,
                           upgradeable,
                           configurable,
                           storable {

  using SafeMath for uint256;
  using CstLibrary for address;

  ITokenLedger public tokenLedger;
  string public storageName;
  string public ledgerName;
  address public externalStorage;
  address public registry;
  uint256 public decimals = 0;

  // This state is specific to the first version of the CST
  // token contract and the token generation event, and hence
  // there is no reason to persist in external storage for
  // future contracts.
  bool public allowTransfers;
  mapping (address => bool) public whitelistedTransferer;
  address[] public whitelistedTransfererForIndex;
  mapping (address => bool) private processedWhitelistedTransferer;
  uint256 public contributionMinimum;

  event Mint(uint256 amountMinted, uint256 totalTokens, uint256 circulationCap);
  event Approval(address indexed _owner,
                 address indexed _spender,
                 uint256 _value);
  event Transfer(address indexed _from,
                 address indexed _to,
                 uint256 _value);
  event WhiteList(address indexed buyer, uint256 holdCap);
  event ConfigChanged(uint256 buyPrice, uint256 circulationCap, uint256 balanceLimit);
  event VestedTokenGrant(address indexed beneficiary, uint256 startDate, uint256 cliffDate, uint256 durationSec, uint256 fullyVestedAmount, bool isRevocable);
  event VestedTokenRevocation(address indexed beneficiary);
  event VestedTokenRelease(address indexed beneficiary, uint256 amount);
  event StorageUpdated(address storageAddress, address ledgerAddress);

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

  constructor(address _registry, string _storageName, string _ledgerName) public payable {
    require(_registry != address(0));
    storageName = _storageName;
    ledgerName = _ledgerName;
    registry = _registry;

    addSuperAdmin(registry);
  }

  /* This unnamed function is called whenever someone tries to send ether directly to the token contract */
  function () public {
    revert(); // Prevents accidental sending of ether
  }

  function getLedgerNameHash() public view returns (bytes32) {
    return keccak256(ledgerName);
  }

  function getStorageNameHash() public view returns (bytes32) {
    return keccak256(storageName);
  }

  function configure(bytes32 _tokenName,
                     bytes32 _tokenSymbol,
                     uint256 _buyPrice,
                     uint256 _circulationCap,
                     uint256 _balanceLimit,
                     address _foundation) public onlySuperAdmins unlessUpgraded initStorage returns (bool) {

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

  function configureFromStorage() public onlySuperAdmins unlessUpgraded initStorage returns (bool) {
    return true;
  }

  function updateStorage(string newStorageName, string newLedgerName) public onlySuperAdmins unlessUpgraded returns (bool) {
    // TODO we should assert contract is frozen before updating storage
    storageName = newStorageName;
    ledgerName = newLedgerName;

    configureFromStorage();

    address ledgerAddress = Registry(registry).getStorage(ledgerName);
    address storageAddress = Registry(registry).getStorage(storageName);
    emit StorageUpdated(storageAddress, ledgerAddress);
    return true;
  }

  function name() public view unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenName());
  }

  function symbol() public view unlessUpgraded returns(string) {
    return bytes32ToString(externalStorage.getTokenSymbol());
  }

  function totalInCirculation() public view unlessUpgraded returns(uint256) {
    return tokenLedger.totalInCirculation().add(totalUnvestedAndUnreleasedTokens());
  }

  function cstBalanceLimit() public view unlessUpgraded returns(uint256) {
    return externalStorage.getBalanceLimit();
  }

  function buyPrice() public view unlessUpgraded returns(uint256) {
    return externalStorage.getBuyPrice();
  }

  function circulationCap() public view unlessUpgraded returns(uint256) {
    return externalStorage.getCirculationCap();
  }

  // intentionally allowing this to be visible if upgraded so foundation can
  // withdraw funds from contract that has a successor
  function foundation() public view returns(address) {
    return externalStorage.getFoundation();
  }

  function totalSupply() public view unlessUpgraded returns(uint256) {
    return tokenLedger.totalTokens();
  }

  function tokensAvailable() public view unlessUpgraded returns(uint256) {
    return totalSupply().sub(totalInCirculation());
  }

  function balanceOf(address account) public view unlessUpgraded returns (uint256) {
    address thisAddress = this;
    if (thisAddress == account) {
      return tokensAvailable();
    } else {
      return tokenLedger.balanceOf(account);
    }
  }

  function transfer(address recipient, uint256 amount) public unlessFrozen unlessUpgraded returns (bool) {
    require(allowTransfers || whitelistedTransferer[msg.sender]);
    require(amount > 0);
    require(!frozenAccount[recipient]);

    tokenLedger.transfer(msg.sender, recipient, amount);
    emit Transfer(msg.sender, recipient, amount);

    return true;
  }

  function mintTokens(uint256 mintedAmount) public onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    uint256 _circulationCap = externalStorage.getCirculationCap();
    tokenLedger.mintTokens(mintedAmount);

    emit Mint(mintedAmount, tokenLedger.totalTokens(), _circulationCap);

    emit Transfer(address(0), this, mintedAmount);

    return true;
  }

  function grantTokens(address recipient, uint256 amount) public onlySuperAdmins unlessFrozen unlessUpgraded returns (bool) {
    require(amount <= tokensAvailable());
    require(!frozenAccount[recipient]);

    tokenLedger.debitAccount(recipient, amount);
    emit Transfer(this, recipient, amount);

    return true;
  }

  function buy() public payable unlessFrozen unlessUpgraded returns (uint256) {
    require(externalStorage.getApprovedBuyer(msg.sender));

    uint256 _buyPrice = externalStorage.getBuyPrice();
    uint256 _circulationCap = externalStorage.getCirculationCap();
    require(msg.value >= _buyPrice);
    require(_buyPrice > 0);
    require(_circulationCap > 0);

    uint256 amount = msg.value.div(_buyPrice);
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

  // intentionally allowing this to be visible if upgraded so foundation can
  // withdraw funds from contract that has a successor
  function foundationWithdraw(uint256 amount) public onlyFoundation returns (bool) {
    /* UNTRUSTED */
    msg.sender.transfer(amount);

    return true;
  }

  function foundationDeposit() public payable unlessUpgraded returns (bool) {
    return true;
  }

  function allowance(address owner, address spender) public view unlessUpgraded returns (uint256) {
    return externalStorage.getAllowance(owner, spender);
  }

  function transferFrom(address from, address to, uint256 value) public unlessFrozen unlessUpgraded returns (bool) {
    require(allowTransfers);
    require(!frozenAccount[from]);
    require(!frozenAccount[to]);
    require(from != msg.sender);
    require(value > 0);

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
  function approve(address spender, uint256 value) public unlessFrozen unlessUpgraded returns (bool) {
    require(spender != address(0));
    require(!frozenAccount[spender]);
    require(msg.sender != spender);

    externalStorage.setAllowance(msg.sender, spender, value);

    emit Approval(msg.sender, spender, value);
    return true;
  }

  function increaseApproval(address spender, uint256 addedValue) public unlessFrozen unlessUpgraded returns (bool) {
    return approve(spender, externalStorage.getAllowance(msg.sender, spender).add(addedValue));
  }

  function decreaseApproval(address spender, uint256 subtractedValue) public unlessFrozen unlessUpgraded returns (bool) {
    uint256 oldValue = externalStorage.getAllowance(msg.sender, spender);

    if (subtractedValue > oldValue) {
      return approve(spender, 0);
    } else {
      return approve(spender, oldValue.sub(subtractedValue));
    }
  }

  function grantVestedTokens(address beneficiary,
                             uint256 fullyVestedAmount,
                             uint256 startDate, // 0 indicates start "now"
                             uint256 cliffSec,
                             uint256 durationSec,
                             bool isRevocable) public onlySuperAdmins unlessUpgraded unlessFrozen returns(bool) {

    uint256 _circulationCap = externalStorage.getCirculationCap();

    require(beneficiary != address(0));
    require(!frozenAccount[beneficiary]);
    require(durationSec >= cliffSec);
    require(totalInCirculation().add(fullyVestedAmount) <= _circulationCap);
    require(fullyVestedAmount <= tokensAvailable());

    uint256 _now = now;
    if (startDate == 0) {
      startDate = _now;
    }

    uint256 cliffDate = startDate.add(cliffSec);

    externalStorage.setVestingSchedule(beneficiary,
                                       fullyVestedAmount,
                                       startDate,
                                       cliffDate,
                                       durationSec,
                                       isRevocable);

    emit VestedTokenGrant(beneficiary, startDate, cliffDate, durationSec, fullyVestedAmount, isRevocable);

    return true;
  }


  function revokeVesting(address beneficiary) public onlySuperAdmins unlessUpgraded unlessFrozen returns (bool) {
    require(beneficiary != address(0));
    externalStorage.revokeVesting(beneficiary);

    releaseVestedTokensForBeneficiary(beneficiary);

    emit VestedTokenRevocation(beneficiary);

    return true;
  }

  function releaseVestedTokens() public unlessFrozen unlessUpgraded returns (bool) {
    return releaseVestedTokensForBeneficiary(msg.sender);
  }

  function releaseVestedTokensForBeneficiary(address beneficiary) public unlessFrozen unlessUpgraded returns (bool) {
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

  function releasableAmount(address beneficiary) public view unlessUpgraded returns (uint256) {
    return externalStorage.releasableAmount(beneficiary);
  }

  function totalUnvestedAndUnreleasedTokens() public view unlessUpgraded returns (uint256) {
    return externalStorage.getTotalUnvestedAndUnreleasedTokens();
  }

  function vestingMappingSize() public view unlessUpgraded returns (uint256) {
    return externalStorage.vestingMappingSize();
  }

  function vestingBeneficiaryForIndex(uint256 index) public view unlessUpgraded returns (address) {
    return externalStorage.vestingBeneficiaryForIndex(index);
  }

  function vestingSchedule(address _beneficiary) public
                                                 view unlessUpgraded returns (uint256 startDate,
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

  function setCustomBuyer(address buyer, uint256 balanceLimit) public onlySuperAdmins unlessUpgraded returns (bool) {
    require(buyer != address(0));
    externalStorage.setCustomBuyerLimit(buyer, balanceLimit);
    addBuyer(buyer);

    return true;
  }

  function setAllowTransfers(bool _allowTransfers) public onlySuperAdmins unlessUpgraded returns (bool) {
    allowTransfers = _allowTransfers;
    return true;
  }

  function setContributionMinimum(uint256 _contributionMinimum) public onlySuperAdmins unlessUpgraded returns (bool) {
    contributionMinimum = _contributionMinimum;
    return true;
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

  function addBuyer(address buyer) public onlySuperAdmins unlessUpgraded returns (bool) {
    require(buyer != address(0));
    externalStorage.setApprovedBuyer(buyer, true);

    uint256 balanceLimit = externalStorage.getCustomBuyerLimit(buyer);
    if (balanceLimit == 0) {
      balanceLimit = externalStorage.getBalanceLimit();
    }

    emit WhiteList(buyer, balanceLimit);

    return true;
  }

  function removeBuyer(address buyer) public onlySuperAdmins unlessUpgraded returns (bool) {
    require(buyer != address(0));
    externalStorage.setApprovedBuyer(buyer, false);

    return true;
  }

  function totalTransferWhitelistMapping() public view returns (uint256) {
    return whitelistedTransfererForIndex.length;
  }

  function setWhitelistedTransferer(address transferer, bool _allowTransfers) public onlySuperAdmins unlessUpgraded returns (bool) {
    require(transferer != address(0));
    whitelistedTransferer[transferer] = _allowTransfers;
    if (!processedWhitelistedTransferer[transferer]) {
      whitelistedTransfererForIndex.push(transferer);
      processedWhitelistedTransferer[transferer] = true;
    }

    return true;
  }
}
