pragma solidity ^0.4.24;

import "../../contracts/Registry.sol";

contract TestingRegistry is Registry {
  address internal constant testingInitializer = 0xEa58Ed38E27dDD7Cf1c6e765B1d61CFC2AE3036E;

  function initialize() public isInitializer {
    owner = testingInitializer;
  }
}
