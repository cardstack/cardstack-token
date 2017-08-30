pragma solidity ^0.4.2;

import "./administratable.sol";
import "./upgradeable.sol";
import "./IRewards.sol";

contract rewardable is administratable, upgradeable {

  address public rewardsContract;

  modifier triggersRewards() {
    _;

    if (rewardsContract != 0x0) {
      IRewards(rewardsContract).processRewards();
    }
  }

  function setRewardsContract(address _rewardsContract) onlySuperAdmins unlessUpgraded returns (bool) {
    rewardsContract = _rewardsContract;
    return true;
  }
}
