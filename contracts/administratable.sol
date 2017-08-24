pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

// TODO a nice feature might be a mechanism to
// facilitate iteration over the admins for auditing purposes

contract administratable is Ownable {
  mapping (address => bool) public admins;
  mapping (address => bool) public superAdmins;

  modifier onlyAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender] && !admins[msg.sender]) throw;
    _;
  }

  modifier onlySuperAdmins {
    if (msg.sender != owner && !superAdmins[msg.sender]) throw;
    _;
  }

  function addSuperAdmin(address admin) onlyOwner {
    superAdmins[admin] = true;
  }

  function removeSuperAdmin(address admin) onlyOwner {
    delete superAdmins[admin];
  }

  function addAdmin(address admin) onlySuperAdmins {
    admins[admin] = true;
  }

  function removeAdmin(address admin) onlySuperAdmins {
    delete admins[admin];
  }
}
