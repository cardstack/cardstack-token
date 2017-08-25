
pragma solidity ^0.4.2;

import "./administratable.sol";

contract upgradeable is administratable {
  address public predecessor;
  address public successor;

  event Upgraded(address indexed successor, address successorAddress);
  event UpgradedFrom(address indexed predecessor, address predecessorAddress);

  modifier unlessUpgraded() {
    if (successor != 0x0) throw;
    _;
  }

  modifier isUpgraded() {
    if (successor == 0x0) throw;
    _;
  }

  modifier hasPredecessor() {
    if (predecessor == 0x0) throw;
    _;
  }

  function isDeprecated() constant returns (bool) {
    return successor != 0x0;
  }

  function upgradeTo(address _successor) onlyAdmins unlessUpgraded {
    successor = _successor;

    Upgraded(_successor, _successor);
  }

  function upgradedFrom(address _predecessor) onlyAdmins {
    require(_predecessor != 0x0);

    predecessor = _predecessor;

    UpgradedFrom(_predecessor, _predecessor);
  }
}
