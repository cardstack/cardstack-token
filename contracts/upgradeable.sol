pragma solidity ^0.4.13;

import "./administratable.sol";

contract upgradeable is administratable {
  address public predecessor;
  address public successor;

  event Upgraded(address indexed successor);
  event UpgradedFrom(address indexed predecessor);

  modifier unlessUpgraded() {
    if (successor != 0x0) revert();
    _;
  }

  modifier isUpgraded() {
    if (successor == 0x0) revert();
    _;
  }

  modifier hasPredecessor() {
    if (predecessor == 0x0) revert();
    _;
  }

  function isDeprecated() constant returns (bool) {
    return successor != 0x0;
  }

  function upgradeTo(address _successor) onlySuperAdmins unlessUpgraded returns (bool){
    successor = _successor;

    Upgraded(_successor);
    return true;
  }

  function upgradedFrom(address _predecessor) onlySuperAdmins returns (bool) {
    require(_predecessor != 0x0);

    predecessor = _predecessor;

    UpgradedFrom(_predecessor);
    return true;
  }
}
