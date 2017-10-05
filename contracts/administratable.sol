pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract administratable is Ownable {
  using SafeMath for uint256;

  uint256 public totalAdminsMapping;
  uint256 public totalSuperAdminsMapping;
  mapping (uint256 => address) public adminsForIndex;
  mapping (uint256 => address) public superAdminsForIndex;
  mapping (address => bool) public admins;
  mapping (address => bool) public superAdmins;
  mapping (address => bool) processedAdmin;
  mapping (address => bool) processedSuperAdmin;

  modifier onlyAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender] && !admins[msg.sender]) revert();
    _;
  }

  modifier onlySuperAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender]) revert();
    _;
  }

  function addSuperAdmin(address admin) onlyOwner {
    superAdmins[admin] = true;
    if (!processedSuperAdmin[admin]) {
      processedSuperAdmin[admin] = true;
      superAdminsForIndex[totalSuperAdminsMapping] = admin;
      totalSuperAdminsMapping = totalSuperAdminsMapping.add(1);
    }
  }

  function removeSuperAdmin(address admin) onlyOwner {
    superAdmins[admin] = false;
  }

  function addAdmin(address admin) onlySuperAdmins {
    admins[admin] = true;
    if (!processedAdmin[admin]) {
      processedAdmin[admin] = true;
      adminsForIndex[totalAdminsMapping] = admin;
      totalAdminsMapping = totalAdminsMapping.add(1);
    }
  }

  function removeAdmin(address admin) onlySuperAdmins {
    admins[admin] = false;
  }
}
