pragma solidity ^0.4.23;

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

  event AddAdmin(address indexed admin);
  event RemoveAdmin(address indexed admin);
  event AddSuperAdmin(address indexed admin);
  event RemoveSuperAdmin(address indexed admin);

  modifier onlyAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender] && !admins[msg.sender]) revert();
    _;
  }

  modifier onlySuperAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender]) revert();
    _;
  }

  function addSuperAdmin(address admin) public onlyOwner {
    require(admin != address(0));
    superAdmins[admin] = true;
    if (!processedSuperAdmin[admin]) {
      processedSuperAdmin[admin] = true;
      superAdminsForIndex[totalSuperAdminsMapping] = admin;
      totalSuperAdminsMapping = totalSuperAdminsMapping.add(1);
    }

    emit AddSuperAdmin(admin);
  }

  function removeSuperAdmin(address admin) public onlyOwner {
    require(admin != address(0));
    superAdmins[admin] = false;

    emit RemoveSuperAdmin(admin);
  }

  function addAdmin(address admin) public onlySuperAdmins {
    require(admin != address(0));
    admins[admin] = true;
    if (!processedAdmin[admin]) {
      processedAdmin[admin] = true;
      adminsForIndex[totalAdminsMapping] = admin;
      totalAdminsMapping = totalAdminsMapping.add(1);
    }

    emit AddAdmin(admin);
  }

  function removeAdmin(address admin) public onlySuperAdmins {
    require(admin != address(0));
    admins[admin] = false;

    emit RemoveAdmin(admin);
  }
}
