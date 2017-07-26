# About CardStack Tokens

## Smart Contracts

### CardStack Token Smart Contract
The CardStack Token smart contract governs the issuance, purchase, and selling of CardStack Tokens (CST) and is owned by the CardStack Foundation. 

### Software and Services Credit Smart Contract
The Software and Services Credit smart contracts is governs the issuance, purchase, and selling of Software and Services Credits (SSC). Software and Services Credits are non transferable credits that are pegged to the USD and expire after a certain period. SSC can be used with a CardStack Application Smart Contract to redeem software and services for a CardStack application that the CardStack Application contract governs.

### CardStack Application Smart Contract
The CardStack Application smart contract is used to collect Software and Services Credits from CardStack users as prepayment for software and services as outlined by the smart contract. The CardStack Application smart contract uses an oracle function to determine how much SSC to burn the SSC based on metered usage of the application and a services multipler. A CardStack Application smart contract is instantiated from a "genesis contract" where the CardStack application maintainer can stipulate the terms of the contract between them and the CardStack user via input paramters in the Genesis contract's function to create a CardStack Applicaiton smart contract. The SSC burns made by this contract are used by the CardStack Token smart contract to determine rewards.

### CardStack Application Genesis Smart Contract
The CardStack Application Genesis Smart Contract is used a means to produce instances of the CardStack Application Smart Contract. A CardStack application maintainer can invoke a function in the Genesis smart contract with various parameters that govern the contract between a CardStack application maintainer and a CardStack user to create a new instance of a CardStack Application smart contract. Various parameters specified as part of the creation of a CardStack Application smart contact would be the amount of SSC and the frequency of SSC redemptions required to maintain the CardStack application. 

### CardStack CST->SSC Exchange Smart Contract
The CardStack CST->SSC Exchange Smart Contract allows users to exchange the CST for SSC based on the current market rate of the CST, which is determined via an oracle function. The CST collected from the contract will be added to the CST reward pool maintained by the CardStack Rewards smart contract.

### CardStack Reward Contract
The CardStack Reward contract is used to diesseminate CST rewards based on attribution signals as interpretted ny an attribution oracle. At regular intervals, as part of the mining function (which is triggered by the CST Token smart contract's mining function), this contract consults an oracle to determine how to allocate the reward pool that has accrued. After the rewards are calculated, the CST balances of the reward recipients are updated accordingly. Additionally, this smart contract uses an oracle functino to determine the hosting fees that have accrued and disburses CST from the reward pool to the hosting provider to pay for hosting fees.

### CardStack CST Custodial Smart Contract
The CardSTack CST Custodial Smart Contract is used to by the SSC contract to purchase CST on behalf of CardStack users that do not wish to retain CST, and rather purchase SSC directly. The CardStack CST Custodial Smart Contract is send ethers from the SSC smart contract's buy function, and uses those ethers to purchase CST at the current CST sell price. The purchased CST are then sent to the CardStack CST -> SSC exchange smart contract which captures the CST for the reward pool and issues the user SSC.

### SSC Top-Off (auto-replenish) Smart Contract
The SSC Top-Off Smart contract is owned by the CardStack user and used to automatically replenish the balance of the CardStack User's Application smart contract. The CardStack User can add SSC to the Top-Off smart contract, as well as the address of the Application Smart contract. When the Application smart contract emits an event that the funds are low, the SSC Top-Off smart contract will replenish the applicaiton contract with enough funds so that a maximum SSC balance (which is configurable) is met. Funds transferred in such a manner will have their expiration date calculated based on the date that the SSC were added to the top-off contract. 

## Lifecycle

1. The CardStack Foundation creates the CardStack Token smart contract that governs CST, as part of this creation the following are established:
    * The total amount of CST
    * A cap on the amount of CST that can be purchased from the CST smart contract
    * The price for which the CST smart contract will sell available CST (in units of wei)
    * The price for which the CST smart contract will buy CST (in units of wei)
    
2. After the CST smart contract has been created, the CardStack Foundation can adjust any of the parameters that were initially specified during the creation of the CST smart contract including:
    * Changing the CST sell cap
    * Changing the price for which CST are bought or sold from the CST smart contract
    * Minting new CST tokens
    
3. The CardStack Foundation create the Software and Services Credit smart contract that governs SSC, as part of this creation the following are established:
    * A pool of ethers (collected from the CardStack Foundation wallet) that can be used to control inflationary pressures so that SSC is pegged to USD. Note: an automatic buying/selling function is used to regulate the the value of the SSC so that it is pegged to the USD
    
4. After the SSC smart contract has been created, the CardStack Foundation can add more ethers to the SSC smart contract which will control the amount of SSC tokens available to purchase.

---- End of initial setup ----

5. A CardStack application maintainer uses the CardStack Application Genesis smart contract to create an instance of an Card Stack Application smart contract for the CardStack application that they are maintaining. This Application smart contract is tied to a particular CardStack application for which it is associated.

6. A CardStack user purchases either CST or SSC:

   a) A CardStack user purchases CST from the CST smart contract. Additionally, the CardStack Foundation may, of its chosing, grant CST to individuals.
   
      * A CardStack user uses the CST->SSC exchange smart contract to exchange their CST to SSC based on the current market value of CST. CST collected from this contract will be added to the reward pool maintained by the CardStack Rewards smart contract. 

   b) A CardStack user uses ethers to purchase SSC from the SSC smart contract.
   
      * the SSC smart contract will, behind the scenes, use the CST Custodial smart contract to perform a custodial purchase of CST with the ethers sent to the buy function of the SSC smart contract. There is a special cap on the amount of CST that are available to be purchased from the CST Custodial smart contract that is treated separately from the sell cap for direct CST purchases.
         
      * The CST custodial start contract will use take CST purchased in this manner will then be presented to the CST->SSC exchange smart contract, so that the CST can be captured as part of the reward pool, and the CardStack user will be given SSC

7. A CardStack user, following the terms of the CardStack Application smart contract, uses SSC to redeem software and services by  with the CardStack Application smart contract that governs the CardStack user's application.

8. A CardStack application maintainer invokes the CardStack Application smart contract to process metered usage _(there needs to be a "heartbeat" that triggers this txn, like a lambda function that has access to a wallet for gas to than can initate this function)_ 
   * The Card Stack application contract consults with an oracle to calculate hosting fees since the last time this function was invoked and uses the services multiplier to determine how many SSC should be burned.
   * The CardStack application contract burns the SSC. This burn signal (left in the ledger of the CardStack application contract) will be used later by the attribution oracle to calculate rewards off-chain.
   * As the SSC balance for the application is depleted due to the consumption of metered resources, events are fired for off-chain processes when the SSC balance is low and when it is empty so that hosting provider diminish or halt hosting services for the application
   * Auto refill services for are available for the CardStack User by leveraging a "top-off" smart contract owned and funded by the CardStack User
   * If the SSC that is being burned originates from an account that has not purchased SSC nor burned SSC during X amount of blocks _(3-6 months?)_ then we consider the SSC to be "expired". For expired SSC we'll add a ledger entry within the Applicaiton smart contract for expired SSC and denote the time (block height) that the expired SSC was entered into the ledger. These expired SSC burn signals will factor into the attribution oracle function.

9. At regular block intervals, as part of the CardStack token mining function a reward function is invoked upon the CardStack Reward smart contract. The CardStack Reward smart contract's reward function is spread out over mulitple blocks as necessary so that the block gas limit is not exceeded):
   * The reward function locks the reward pool while we are processing the reward function and establishes another pool for any new rewards to be collected for the next reward capture period (as well as captures the new reward cycle's start block height).
   * The CST smart contract mints some percentage of new CST based on the amount in the reward pool and then adds those newly minted tokens to the reward pool.
   * The reward function consults a "fees" oracle to get hosting fees to pay the hosting providers and transfers the appropriate amount of CST funds from the locked reward pool to the hosting provider to pay for hosting since the last reward cycle. Inputs to the "fees" oracle will be the reward cycle's start time and end time in terms of block height
   * The reward function invokes attribution oracle to get a list of etherium addresses and weights for rewards (see note at bottom of document). Inputs to the attribution oracle will be the reward cycle's start time and end time in terms of block height.
   * The reward function divides the remainder of the CST in the locked reward pool based on the weights and addresses that the oracle function returns. Note, since etherium cannot support floating points, the weights provided to the smart contract should be described as fractions: NUMERATOR, DENOMINATOR, eg. `12.5%` would be described as `125, 1000`.
  
   
   
**Note:** The attribution oracle can discover all the cardstack applications and their github projects via the genesis contract. The Genesis contract will maintain a ledger of all the cardstack application conracts. From the cardstack application contracts, each application contract can point to a gitub project URL (requires public github project?), and from the github project URL a list of contibutors, their addresses, and open source contribution percentages will be found in an attribution.json file in the root of the project.
   
    

  



