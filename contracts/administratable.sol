pragma solidity ^0.4.2;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract administratable is Ownable {
  mapping (address => bool) public admins;

  modifier onlyAdmins {
    if (msg.sender != owner && !admins[msg.sender]) throw;
    _;
  }

  function addAdmin(address admin) onlyOwner {
    admins[admin] = true;
  }

  function removeAdmin(address admin) onlyOwner {
    delete admins[admin];
  }
}
