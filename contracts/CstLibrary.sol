pragma solidity ^0.4.13;
import "./ExternalStorage.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

library CstLibrary {
  using SafeMath for uint256;

  function getTokenName(address _storage) public constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenName");
  }

  function setTokenName(address _storage, bytes32 tokenName) public {
    ExternalStorage(_storage).setBytes32Value("cstTokenName", tokenName);
  }

  function getTokenSymbol(address _storage) public constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenSymbol");
  }

  function setTokenSymbol(address _storage, bytes32 tokenName) public {
    ExternalStorage(_storage).setBytes32Value("cstTokenSymbol", tokenName);
  }

  function getBuyPrice(address _storage) public constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstBuyPrice");
  }

  function setBuyPrice(address _storage, uint256 value) public {
    ExternalStorage(_storage).setUIntValue("cstBuyPrice", value);
  }

  function getSellPrice(address _storage) public constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstSellPrice");
  }

  function setSellPrice(address _storage, uint256 value) public {
    ExternalStorage(_storage).setUIntValue("cstSellPrice", value);
  }

  function getCirculationCap(address _storage) public constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstCirculationCap");
  }

  function setCirculationCap(address _storage, uint256 value) public {
    ExternalStorage(_storage).setUIntValue("cstCirculationCap", value);
  }

  function getMinimumBalance(address _storage) public constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstMinimumBalance");
  }

  function setMinimumBalance(address _storage, uint256 value) public {
    ExternalStorage(_storage).setUIntValue("cstMinimumBalance", value);
  }

  function getFoundation(address _storage) public constant returns(address) {
    return ExternalStorage(_storage).getAddressValue("cstFoundation");
  }

  function setFoundation(address _storage, address value) public {
    ExternalStorage(_storage).setAddressValue("cstFoundation", value);
  }

  function getAllowance(address _storage, address account, address spender) public constant returns (uint256) {
    return ExternalStorage(_storage).getMultiLedgerValue("cstAllowance", account, spender);
  }

  function setAllowance(address _storage, address account, address spender, uint256 allowance) public {
    ExternalStorage(_storage).setMultiLedgerValue("cstAllowance", account, spender, allowance);
  }

  function getTotalUnvestedAndUnreleasedTokens(address _storage) public constant returns(uint256) {
    return ExternalStorage(_storage).getUIntValue("cstUnvestedAndUnreleasedTokens");
  }

  function setTotalUnvestedAndUnreleasedTokens(address _storage, uint256 value) public {
    ExternalStorage(_storage).setUIntValue("cstUnvestedAndUnreleasedTokens", value);
  }

  function vestingMappingSize(address _storage) public returns(uint256) {
    return ExternalStorage(_storage).getLedgerCount("cstFullyVestedAmount");
  }

  function vestingBeneficiaryForIndex(address _storage, uint256 index) public returns(address) {
    return ExternalStorage(_storage).ledgerEntryForIndex(sha3("cstFullyVestedAmount"), index);
  }

  function releasableAmount(address _storage, address beneficiary) public constant returns (uint256) {
    uint256 releasedAmount = getVestingReleasedAmount(_storage, beneficiary);
    uint256 amount = vestedAmount(_storage, beneficiary).sub(releasedAmount);

    if (amount < 0) {
      return 0;
    }

    return amount;
  }

  function vestedAmount(address _storage, address beneficiary) public constant returns (uint256) {
    uint256 start = getVestingStart(_storage, beneficiary);
    uint256 fullyVestedAmount = getFullyVestedAmount(_storage, beneficiary);

    if (start == 0 || fullyVestedAmount == 0) {
      return 0;
    }

    uint256 duration = getVestingDuration(_storage, beneficiary);
    uint256 cliff = getVestingCliff(_storage, beneficiary);
    uint256 revokeDate = getVestingRevokeDate(_storage, beneficiary);

    if (now < cliff || (revokeDate > 0 && revokeDate < cliff)) {
      return 0;
    } else if (revokeDate > 0 && revokeDate > cliff) {
      return fullyVestedAmount.mul(revokeDate.sub(start)).div(duration);
    } else if (now >= start.add(duration)) {
      return fullyVestedAmount;
    } else {
      return fullyVestedAmount.mul(now.sub(start)).div(duration);
    }
  }

  function canGrantVestedTokens(address _storage, address beneficiary) public constant returns (bool) {
    uint256 existingFullyVestedAmount = getFullyVestedAmount(_storage, beneficiary);
    if (existingFullyVestedAmount == 0) {
      return true;
    }

    uint256 existingVestedAmount = vestedAmount(_storage, beneficiary);
    uint256 existingReleasedAmount = getVestingReleasedAmount(_storage, beneficiary);
    uint256 revokeDate = getVestingRevokeDate(_storage, beneficiary);

    if (revokeDate > 0 ||
        (existingVestedAmount == existingFullyVestedAmount &&
        existingReleasedAmount == existingFullyVestedAmount)) {
      return true;
    }

    return false;
  }

  function canRevokeVesting(address _storage, address beneficiary) public constant returns (bool) {
    bool isRevocable = getVestingRevocable(_storage, beneficiary);
    uint256 revokeDate = getVestingRevokeDate(_storage, beneficiary);
    uint256 start = getVestingStart(_storage, beneficiary);
    uint256 duration = getVestingDuration(_storage, beneficiary);

    return start > 0 &&
           isRevocable &&
           revokeDate == 0 &&
           now < start.add(duration);
  }

  function revokeVesting(address _storage, address beneficiary) public {
    require(canRevokeVesting(_storage, beneficiary));

    uint256 totalUnvestedAndUnreleasedAmount = getTotalUnvestedAndUnreleasedTokens(_storage);
    uint256 unvestedAmount = getFullyVestedAmount(_storage, beneficiary).sub(vestedAmount(_storage, beneficiary));

    setVestingRevokeDate(_storage, beneficiary, now);
    setTotalUnvestedAndUnreleasedTokens(_storage, totalUnvestedAndUnreleasedAmount.sub(unvestedAmount));
  }

  function getVestingSchedule(address _storage, address _beneficiary) public
                                                                      constant returns (uint256 startDate,
                                                                                        uint256 cliffDate,
                                                                                        uint256 durationSec,
                                                                                        uint256 fullyVestedAmount,
                                                                                        uint256 releasedAmount,
                                                                                        uint256 revokeDate,
                                                                                        bool isRevocable) {
    startDate         = getVestingStart(_storage, _beneficiary);
    cliffDate         = getVestingCliff(_storage, _beneficiary);
    durationSec       = getVestingDuration(_storage, _beneficiary);
    fullyVestedAmount = getFullyVestedAmount(_storage, _beneficiary);
    releasedAmount    = getVestingReleasedAmount(_storage, _beneficiary);
    revokeDate        = getVestingRevokeDate(_storage, _beneficiary);
    isRevocable       = getVestingRevocable(_storage, _beneficiary);
  }

  function setVestingSchedule(address _storage,
                              address beneficiary,
                              uint256 fullyVestedAmount,
                              uint256 startDate,
                              uint256 cliffDate,
                              uint256 duration,
                              bool isRevocable) public {
    require(canGrantVestedTokens(_storage, beneficiary));

    uint256 totalUnvestedAndUnreleasedAmount = getTotalUnvestedAndUnreleasedTokens(_storage);
    setTotalUnvestedAndUnreleasedTokens(_storage, totalUnvestedAndUnreleasedAmount.add(fullyVestedAmount));

    ExternalStorage(_storage).setLedgerValue("cstVestingStart", beneficiary, startDate);
    ExternalStorage(_storage).setLedgerValue("cstVestingCliff", beneficiary, cliffDate);
    ExternalStorage(_storage).setLedgerValue("cstVestingDuration", beneficiary, duration);
    ExternalStorage(_storage).setLedgerValue("cstFullyVestedAmount", beneficiary, fullyVestedAmount);
    ExternalStorage(_storage).setBooleanMapValue("cstVestingRevocable", beneficiary, isRevocable);

    setVestingRevokeDate(_storage, beneficiary, 0);
    setVestingReleasedAmount(_storage, beneficiary, 0);
  }

  function releaseVestedTokens(address _storage, address beneficiary) public {
    uint256 unreleased = releasableAmount(_storage, beneficiary);
    uint256 releasedAmount = getVestingReleasedAmount(_storage, beneficiary);
    uint256 totalUnvestedAndUnreleasedAmount = getTotalUnvestedAndUnreleasedTokens(_storage);

    releasedAmount = releasedAmount.add(unreleased);
    setVestingReleasedAmount(_storage, beneficiary, releasedAmount);
    setTotalUnvestedAndUnreleasedTokens(_storage, totalUnvestedAndUnreleasedAmount.sub(unreleased));
  }

  function getVestingStart(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstVestingStart", beneficiary);
  }

  function getVestingCliff(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstVestingCliff", beneficiary);
  }

  function getVestingDuration(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstVestingDuration", beneficiary);
  }

  function getFullyVestedAmount(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstFullyVestedAmount", beneficiary);
  }

  function getVestingRevocable(address _storage, address beneficiary) public constant returns(bool) {
    return ExternalStorage(_storage).getBooleanMapValue("cstVestingRevocable", beneficiary);
  }

  function setVestingReleasedAmount(address _storage, address beneficiary, uint256 value) public {
    ExternalStorage(_storage).setLedgerValue("cstVestingReleasedAmount", beneficiary, value);
  }

  function getVestingReleasedAmount(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstVestingReleasedAmount", beneficiary);
  }

  function setVestingRevokeDate(address _storage, address beneficiary, uint256 value) public {
    ExternalStorage(_storage).setLedgerValue("cstVestingRevokeDate", beneficiary, value);
  }

  function getVestingRevokeDate(address _storage, address beneficiary) public constant returns(uint256) {
    return ExternalStorage(_storage).getLedgerValue("cstVestingRevokeDate", beneficiary);
  }

  function getRewardsContractHash(address _storage) public constant returns (bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstRewardsContractHash");
  }

  function setRewardsContractHash(address _storage, bytes32 rewardsContractHash) public {
    ExternalStorage(_storage).setBytes32Value("cstRewardsContractHash", rewardsContractHash);
  }

}
