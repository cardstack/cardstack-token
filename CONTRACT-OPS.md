# Contract Operations
This document describes the various contract operations necessary for mantaining operational contiunity for the Cardstack Token ecosystem in the context of the Ethereum main network.

* [Terms](#terms)

* [Cardstack Token Creation Ceremony](#cardstack-token-creation-ceremony)
   * [Preparation](#preparation)
   * [T-minus 3 days](#t-minus-3-days)
      * [Cold Wallet Setup](#cold-wallet-setup)
      * [Contract Ops Funding](#contract-ops-funding)
      * [Secure Terminal Setup](#secure-terminal-setup)
   * [T-minus 1 day](#t-minus-1-day)
      * [Fund Operations Wallets for Gas Fees](#fund-operations-wallets-for-gas-fees)
   * [T-minus 3 hours](#t-minus-3-hours)
      * [Contract Creation](#contract-creation)
   * [T-minus 30 minutes](#t-minus-30-minutes)
   * [T-minus 0](#t-minus-0)

* [Cardstack Token Continuing Operations](#cardstack-token-continuing-operations)
   * [Monitoring CST Token Sale](#monitoring-cst-token-sale)
   * [Monitoring CST Ledger](#monitoring-cst-ledger)
   * [Withdrawing ETH from CST contract for Cardstack Foundation](#withdrawing-eth-from-cst-contract-for-cardstack-foundation)
   * [Depositing ETH to the CST contract from the Cardstack Foundation](#depositing-eth-to-the-cst-contract-from-the-cardstack-foundation)
   * [Freezing CST Token](#freezing-cst-token)
   * [Freezing CST Account](#freezing-cst-account)

## Terms
The following terms are used in this guide:

* **Cold Wallet** Also referred to as _hardware wallet_; this refers to the Trezor and Nano S wallet devices that maintain the private key used to sign transactions for Ethereum addresses derived from these devices. These devices are used in combination with www.myetherwallet.com to sign transactions used to manipulate the CST contracts. These devices allow the private key to exist completely separate from the computer used to initiate the Ethereum transactions, thus allowing us to send transactions from clients that are not secured, as the private key used to sign the transactions to manipulate the CST contracts never leave the cold wallet device, and are unknown to the human performing the transaction as well as to the computer that is issuing the transaction.

* **Funding Wallet** This is the wallet(s) that provides ETH that is used to pay for the gas required to perform the contract operations. Prior to the issuance of the Ethereum transactions to manipulate the CST contracts, the funds necessary to cover the gas charges is transfered from the funding wallet(s) to the various cold wallets and secure terminal. The gas required for the cold wallets is of nominal value (generally 0.001 ETH or less is all that is required for most contract operations). Contract creation, however does require more significant funds (> 1 ETH). Before contracts are created, the necessary gas charges and transferred from the funding wallet(s) to the wallet used by the secure terminal.

* **Secure Terminal** The secure terminal is the computer that is used to create the CST contracts. The CST contract creation process is complex enough, that we are unable to leverage the cold wallet and must use truffle to orchestrate the `geth` Ethereum CLI client to create our CST contracts. The secure terminal is a computer that is only used expressely for the purposes of creating CST contracts. When it is not being used to create CST contracts it is turned off and stored in a safety deposit box. The secure terminal is only ever allowed to be powered on in the clean room. The secure terminal's camera has tape applied to the camera. More details on the secure terminal is described in the sections below.

* **Clean Room** The clean room is the physical space in which we perform highly sensitive tasks. The clean room is a room that has no occluded surfaces, no windows, and ideally, no HVAC vents. In the clean room the only permitted electronics are the secure terminal, the USB sticks, and the cold wallets. All other electronics are expressly prohibited from the clean room when the secure terminal and USB sticks are present in the clean room, i.e. computers, TV's, refrigerators, cameras, watches, fit bits, any IoT devices, etc. ***AND ESPECIALLY NO PHONES!!!*** In fact, all phones must be left in a different room outside of recording range. Within the clean room is a light fixture, a simple table and at least 2 simple chairs.  No single person is permitted to be in the clean room alone with the secure terminal, cold wallets, USB sticks, or exposed passwords on paper. In these scenarios, there should always be at least 2 highly trusted individuals _(maybe also we need a representative from the CST Foundation in these scenarios?)_.  _(In a pinch, perhaps we could use a closet or a bathroom as our makeshift clean room?)_

## Cardstack Token Creation Ceremony
This section describes the creation of the Cardstack token contracts, and the ceremony that encompasses this process. All contract creation should derive from some form of this ceremony depending on the sensitivity of the contract.

### Preparation
The following physical materials need to be acquired in perparation for the ceremony:
* At least 3 USB sticks that have been purchased in person from a reputable vendor (e.g. Apple Store) that are in their original packaging and have not been tampered with. 
* At least 3 cold wallets
* A brand new (not refurbished), sealed in the box, MacBook Pro purchased in person at an Apple Store. Buy the smallest physical size computer so that it does not require a lot of space in the safety deposit box _(purchased with cash?)_
* Paper & Pen
* Opaque Tape
* Opaque envelopes
* At least 10 _(?)_ safety deposit boxes from mulitple banks throughout the city. 1 should box that is large enough to hold the MacBook Pro. Boxes used for cold wallets and cold wallet passwords need to be available 24/7 365 days a year in relative proximity to the base of our operations so that they are readily available in the event of emergency contract operation procedures (aka token freeze).
* Ideally the Cardstack Foundation Ethereum address has been established

### T-minus 3 days
#### Cold Wallet Setup
* Go to the clean room with at least one other person
* Unpackage each cold wallet, perform the following steps for each cold wallet
* Create an 8 digit pin for each cold wallet
* Create a name for the cold wallet, e.g. "CST Wallet #1" _(Trezor wallets let you assign a name to them, I don't think Nano wallets can be named)_
* Write the 8 digit pin on a piece of paper for each cold wallet, and write the name of the cold wallet that the PIN applies to. (It is very important that there are no digital recordings of this paper--but you're in the clean room right?! why would you have a camera in the clean room!?)
* Place the paper that has the PIN into the opaque envelope.
* Write the 24 word backup pass phrases for each cold wallet on a different sheet of paper, and write the name of the cold wallet that the 24 word backup pass phrases apply to.
* Place the paper that has the 24 word backup pass phrases into the opaque envelope
* Using a non-secure terminal in the clean room (make sure the USB sticks and secure terminal are not in the clean room), with a piece of tape covering the camera, go to www.myetherwallet.com and chose the first Ethereum address on the cold wallet. Copy this address to the clipboard.
* In the `cardstack-token` GitHub project add the cold wallet ethereum address to the file contract-ops/cold-wallets.md along with the name of the cold wallet. (Ethereum addresses are public keys, so it is ok that these addresses are in the clear and not locked down). and commit this update.
* Deposit the cold wallets in separate highly available 24/7 safety deposit boxes.
* Deposit the cold wallet PINs in separate in separate highly available 24/7 safety deposit boxes, dont place the PINs in the same box as their cold wallet conterpart. (It should be ok to mix cold wallet #1 in the same box as PIN #2).
* Deposit the 24 word backup pass phrases in separate safety deposit boxes, dont place the pass phrases in the same box as their cold wallet conterpart. (It should be ok to mix cold wallet #1 in the same box as pass phrases #2). These do not need to be highly available as they are only needed if the PIN's are lost.
* Congratulations you have completed the cold wallet setup 🎉🎊.

#### Contract Ops Funding
* Retreive one of the cold wallets and its PIN (if you have not commited the PIN to memory) from the safety deposit box.
* Purchase at least 2 ETH from the funding accounts (may need to wait a day or two for the purchases to clear) using a brand new address on one of the cold wallets. If you have not memorized the PIN for the cold wallet, go to the clean room with the cold wallet PIN (and a another person) along with an unsecure terminal and perform the purchase.
* Note the Ethereum account that you have used to purchase the ethers and the cold wallet name that you have used in `cardstack-token` GitHub project add the cold wallet ethereum address to the file contract-ops/cold-wallets.md.
* Return cold wallet and PIN to safety deposit box.
* Wait for the transaction to clear (may need to take a couple days).

#### Secure Terminal Setup
* Purchase a brand new (not refurbished), sealed in box, MacBook pro in person at an Apple store _(in cash?)_ (choose a smaller model to fit in a safety deposit box).
* Purchase at least 3 USB sticks in person from a reputable vendor (e.g. Apple Store) that are in their original packaging and have not been tampered with. 
* Go to the clean room with at least one other person, make sure to do this early in the morning, as this task will take all day. Make sure that *absolutely* no other electronic devices are in the clean room (this is the most sensitive clean room operation).
* Unbox the computer and power on, place a piece of tape over the camera.
* Do not create an icloud account, nor log in with an icloud account
* Create a user and password.
* Write down the password on a piece of paper and place the password in an envelope.
* Record fingerprint TouchID of at least 2 other highly trusted people in the room on the MacBook
* Perform OS X software update
* Make sure computer clock is synced with the current time, and in the correct timezone.
* Install the latest official Ethereum Wallet App: http://github.com/ethereum/mist/releases, and locate the dmg for the Ethereum Wallet Installer for Mac OS X.
* Install X-Code and the dev tools that go along with X-code
* Install brew
* Perform a github clone of the https://github.com/cardstack/cardstack-token project and cd to that directory.
* install `geth`
```
brew tap ethereum/ethereum
brew install ethereum
```
* launch `geth` and confirm that you can see blocks downloading. wait for the latest block to download (shouldn't take too long using the `--fast` keyword):
```
geth --rpc --fast --cache=512 --rpcapi db,eth,net,web3,personal
```
* install nvm:
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh | bash
```
* install node 7.6+
```
nvm install node 7.6
```
* switch to node 7.6
```
nvm use node 7.6
```
* install yarn
```
curl -o- -L https://yarnpkg.com/install.sh | bash
```
* install truffle
```
yarn global add truffle
```
* yarn install the project
```
yarn install
```
* Perform a truffle build and make sure that it runs without errors (ignore the warnings):
```
npm run build
```
* For shits and grins you can run the tests as well (see the README.md)

* Add the Ethereum Wallet to the /Applications folder, and launch the Ethereum Wallet App.
* Select the option to use the "Main Network" and click on "Skip" when asked if we have a wallet file.
* You will be prompted to create an account with a password, do this. The password you select should be at least 8 random words that you and your partner(s) contribute. You will have to type this password out, so don't choose words that are super hard to spell.
* The Ethereum wallet will begin to download the mainnet block chain. This will take about 8-12 hours. You can click on "Launch Application" to perform the next steps while the blocks are downloading.
* Write down the password that you create the account with on 3 different pieces of paper.
* Place those pieces of paper in separate opaque envelopes
* From the ethereum wallet select File -> Backup -> Accounts from teh file menu. This will open your finder to a `keystore` folder.
* Put a USB stick in the MacBook and format the USB Stick (repeat for each USB stick)
* Copy the file in the `keystore` folder on to each USB stick (it will be named something like `UTC--2017-07-11T16-12-35.585181429Z--48ed71f1ec9c`).
* Copy the Ethereum main address of the wallet and paste into the `cardstack-token` GitHub project contract-ops/secure-terminal.md (this address is the public key and will be public knowledge after the contract is created, so it is ok to display this address in the clear and not locked down).
* Update the `cardstack-token` GitHub project `./truffle.js` file `mainnet.from` entry with the Ethereum wallet's main address from the previous setp.
* Launch the Ethereum wallet app, and wait for blocks to complete downloading
* Power off the secure terminal
* Deposit the secure terminal and the user password back in the safety deposit box
* Congratulations you have completed the setup of the secure terminal 🎉🎊.


### T-minus 1 day

#### Fund Operations Wallets for Gas Fees
* From the safety deposit box retrieve the cold wallet used to purchase ethers for operations gas fees and its PIN.
* Go to the clean room with a partner, bring an unsecured computer with tape over the camera 
* Using the cold wallet and www.myetherwallet.com transfer ETH to the Ethereum addresses you recorded for the cold wallets and the secure terminal's wallet main account.
  * Transfer at 1 ETH to the secure terminal's wallet main account address that was recorded in `cardstack-token` GitHub project contract-ops/secure-terminal.md
  * Transfer 0.25 ETH to each of the cold wallet's primary addresses that you recorded in `cardstack-token` GitHub project contract-ops/cold-wallets.md
* Return the cold wallet and PIN to the safety deposit box.

### T-minus 3 hours

#### Contract Creation
* From the safety deposit box retrieve:
  * The secure terminal
  * login password to the secure terminal
  * password of the secure terminal's Ethereum wallet
  * One cold wallet and it's PIN
* Enter the clean room with no electronic devices, tape on the secure terminal's camera, and a partner
* Power on the secure terminal and login
* From the terminal start `geth` and unlock the wallet's main address (recorded in `cardstack-token` GitHub project  contract-ops/secure-terminal.md):
```
geth --rpc --rpcapi db,eth,net,web3,personal --unlock="secure terminal wallet's main address"
```
  * you will be prompted for the password to the secure terminal's Ethereum wallet, enter it
* Wait for the current block to be downloaded. Use https://ethstats.net/ to see the current block number.
* From the terminal, go to the cardstack-token cloned github project
* Make sure to `nvm use 7.6` in the terminal
* perform a clean build
```
rm -rf ./build && npm run build
```
* Create the contracts in mainnet:
```
truffle migrate --reset --network=mainnet
```
The contracts will take 5-10 minutes to be created depending on network conditions. We are currently using a 30 GWEI gas price. This can be increased in the truffle.js file for faster transaction mining (albiet at a higher overall deployment cost).
* When the contracts have completed deploying copy the output from the `truffle migrate` command to `cardstack-token` GitHub project `contract-ops/deploys/<current date timestamp>.txt` and commit the file. The addresses included in the output from `truffle migrate` are very important. Note the `Registry` address and the `CardStackToken` address.
* Register the CST contract with the registry by executing:
```
truffle exec ./scripts/cst-register.js --cst="<CardStackToken address>" --registry="<Registry Address>" --network=mainnet
```
* Run the system info command to confirm the CST contract was registered correctly:
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```
* Grant super admin permissions to each of the cold wallet addresses. Using the `cardstack-token` GitHub project `contract-ops/cold-wallets.md` file, for each address execute the following command:
```
truffle exec ./scripts/add-super-admin.js --address="<cold wallet address>" --network=mainnet -r <registry address>
```
* Run the system info command to confirm the super admins were added correctly:
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```
* Power down the secure terminal and return the secure terminal, secure terminal user password and secure terminal's wallet password to safety deposit (or if you don't wanna run back to the bank, power-down the secure terminal and remove from clean room, assign a pair to watch over the secure terminal while the final steps are performed). 
* At this point the CST contract exists in mainnet, but it has not been configured as an ERC-20 token and no tokens have been minted yet. The contract will not allow anyone to obtain CST yet.

### T-minus 30 minutes
* Bring an unsecure termimal that has the cardstack token GH project installed and configured into the clean room with tape across the camera.
* Go to www.myetherwallet.com and plug in cold wallet into the unsecure terminal
* Start `geth` (no need to unlock any accounts, as the cold wallet will be doing all the signing)
```
geth --rpc --rpcapi db,eth,net,web3,personal
```
* From the terminal, in the cardstack token project directory execute this command to create the contract confugration transaction (note that you can't actually sell CST back to the contract, but the contract still needs to have a sellPriceEth set):
```
truffle exec ./scripts/cst-configure.js --tokenName="Cardstack Token" --tokenSymbol="CST" --buyPriceEth=0.005 --sellPriceEth=0.005 sellCap=50000000 --buyerPool=50000000 --maximumBalancePercentage=100% --foundation="<foundation address>" -r "<registry address>" -d --network=mainnet
```
(These numbers are examples, use the real values when the time comes. Also note that the foundation address is optional)
* The result will be an Ethereum address, data, and estimated gas for the transaction. Copy paste these values into the www.myetherwallet.com. for the gas limit, use the estimated gas as your guide. The gas limit describes the units of gas that this transaction will allow to be consumed. You are not penalized for using a larger value than the estimated gas. You are only charged for gas that your transaction actually uses. Also, increasing this particular value does not make your tranaction process faster (that is a different field).
* adjust the gas price slider in the upper right to reflect the speed that you want the transaction to be processed with.
* click the button to confirm the transaction
* enter the PIN for the cold wallet
* confirm the transaction on the cold wallet
* send the signed transaction
* monitor the completion of the transaction.
* after the transaction is complete view the CST system info and confirm that the configuration has updated correctly: 
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```
* Now mint the CST tokens, this should represent the total eventual amount of tokens after the final phase of the CST token sale.
```
truffle exec ./scripts/cst-mint-tokens.js --amount=1000000000 -r <registry address> -d --network=mainnet
```
* The result will be an Ethereum address, data, and estimated gas for the transaction. Copy paste these values into the www.myetherwallet.com. for the gas limit, use the estimated gas as your guide.
* adjust the gas price slider in the upper right to reflect the speed that you want the transaction to be processed with.
* click the button to confirm the transaction
* enter the PIN for the cold wallet
* confirm the transaction on the cold wallet
* send the signed transaction
* monitor the completion of the transaction.
* after the transaction is complete view the CST system info and confirm that the configuration has updated correctly: 
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```

* Next, whitelist the buyers of CST, note that a minimum balance percentage for the buyer only needs to be set if it deviates from the global maximum percentage set in the contract:
```
truffle exec ./scripts/cst-add-buyer.js --address=<buyer's address> --maximumBalancePercentage=0.2% -r <registry address> -d --network=mainnet
```
* The result will be an Ethereum address, data, and estimated gas for the transaction. Copy paste these values into the www.myetherwallet.com. for the gas limit, use the estimated gas as your guide.
* adjust the gas price slider in the upper right to reflect the speed that you want the transaction to be processed with.
* click the button to confirm the transaction
* enter the PIN for the cold wallet
* confirm the transaction on the cold wallet
* send the signed transaction
* monitor the completion of the transaction.
* after the transaction is complete view the CST system info and confirm that the configuration has updated correctly: 
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```

* Next, generate the information that you need to share with the outside world on how to buy a CST token:
```
truffle exec ./scripts/cst-buy-info.js --network=mainnet -r <registry address>
``` 
* The result will be an Ethereum address, data, and estimated gas to purchase CST tokens.
* The CST is now available for purchase and the CST contract will disable the `buy()` function as soon as the amount of CST tokens sold reaches the `sellCap` specified during the CST configuration or the buyer's balance would exceed the maximum balance amount after the purchase of CST.

### T-minus 0
* Share the CST purchase information publically.
* Return the cold wallet and PIN to safety deposit
* Congratulations the CST token sale is live 🎉🎊












## Cardstack Token Continuing Operations
### Monitoring CST Token Sale
To view the state of the various contracts in the CST ecosystem, execute the following command:
```
truffle exec ./scripts/system-info.js --network=mainnet -r <registry address>
```

This will return a response that looks like this: 
```
truffle exec ./scripts/system-info.js --network=rinkeby -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535

Contracts:
  Registry: 0x9f0055eb73e36973594634cd65fab48a6aa11535 (registry)
  Storage: 0x301618ced6c48af5c5b949680a24f0912297b851 (storage)
  Ledger: 0xc56af65b69c3ff0cd17980e0388a092fc30e9460 (ledger)
  CST contract: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e (cst)

Registry (0x9f0055eb73e36973594634cd65fab48a6aa11535):
  cst: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e (cst)
  cstStorage: 0x301618ced6c48af5c5b949680a24f0912297b851 (storage)
  cstLedger: 0xc56af65b69c3ff0cd17980e0388a092fc30e9460 (ledger)

  Registry super admins:
    0xc5d2ee825f8bb57d18726f288ae899a890415f58

  Registry admins:


Cardstack Token (0xf96f2ca367e194ce82b1cb86d4bb495241cac93e):
  registry: 0x9f0055eb73e36973594634cd65fab48a6aa11535
  storageName: cstStorage
  ledgerName: cstLedger
  isFrozen: false
  deprecated: false
  successor: 0x0000000000000000000000000000000000000000
  name: Cardstack Token
  symbol: CST
  buyPrice (ETH): 0.002
  sellPrice (ETH): 0.002
  sellCap: 1000000
  totalSupply: 1000000000
  balance (ETH): 0.4
  minimumBalance (ETH): 0
  foundation: 0x0000000000000000000000000000000000000000

  CST super admins:
    0x9f0055eb73e36973594634cd65fab48a6aa11535 (registry)
    0xc5d2ee825f8bb57d18726f288ae899a890415f58

  CST admins:

  Frozen Accounts:


Ledger (0xc56af65b69c3ff0cd17980e0388a092fc30e9460)
  totalTokens: 1000000000
  totalInCirculation: 200
  number of accounts: 1

  Ledger super admins:
    0x9f0055eb73e36973594634cd65fab48a6aa11535 (registry)

  Ledger admins:
    0xf96f2ca367e194ce82b1cb86d4bb495241cac93e (cst)


Storage (0x301618ced6c48af5c5b949680a24f0912297b851)
  Storage super admins:
    0x9f0055eb73e36973594634cd65fab48a6aa11535 (registry)

  Storage admins:
    0xf96f2ca367e194ce82b1cb86d4bb495241cac93e (cst)
```

### Monitoring CST Ledger
To view a list of all accounts that hold CST tokens execute the script:
```
truffle exec ./scripts/ledger-info.js --network=mainnet -r <registry address>
```

This will return a response like this:
```
truffle exec ./scripts/ledger-info.js --network=rinkeby -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535
Ledger (0xc56af65b69c3ff0cd17980e0388a092fc30e9460
  totalTokens: 1000000000
  totalInCirculation: 200
  number of accounts: 1

Accounts:
  0xd481b3ebd3b8109778631f6d276e3ae47ece9b5f: 200
```
### Withdrawing ETH from CST contract for Cardstack Foundation
In order to withdraw ETH from the CST contract, first ensure that the Cardstack Foundation's Ethereum wallet address is set on the CST contract using the `scripts/system-info.js` script, also make sure this address has enough of a balance to pay gas fees for the request. If the Cardstack Foundation address has not been set or is incorrect, then use the `scripts/cst-configure.js` script to set the foundation address:

```
truffle exec ./scripts/cst-configure.sh --tokenName="Cardstack Token" --tokenSymbol="CST" --buyPriceEth=0.005 --sellPriceEth=0.005 sellCap=50000000 --foundation="<foundation address>" -r "<registry address>" -d --network=mainnet
```

Then use the `scripts/cst-withdraw-info.js` to formulate the request that will be issued from the Cardstack Foundation, where the amount to withdraw is in units of ETH:
```
truffle exec ./scripts/cst-withdraw-info.js --amount=0.2 --network=mainnet -r "<registry address>"
```
This will return instructions that can be sent to the Cardstack Foundation for how to perform their withdrawal:
```
truffle exec ./scripts/cst-withdraw-info.js --amount=0.2 --network=rinkeby -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535

To withdraw ETH from the CST contract, send 0 ETH to the following address with the following data from the wallet with the address 0x395d155505432d55a8d8ba9c6c49f8211b65d609:
Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0xcedcd77000000000000000000000000000000000000000000000000002c68af0bb140000
Estimated gas: 34002
```

### Depositing ETH to the CST contract from the Cardstack Foundation
In order to deposit ETH into the CST contract, use the `scripts/cst-deposit-info.js` script to show the deposit request:
```
truffle exec ./scripts/cst-deposit-info.js --network=mainnet -r "<registry address>"
```
This will result in the instructions to deposit ETH into the CST contract:
```
truffle exec ./scripts/cst-deposit-info.js --network=rinkeby -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535

To deposit ETH into the CST contract, send ETH to the following address with the following data:
Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0x9ae066b0
Estimated gas: 22612
```

### Freezing CST Token
In order freeze the CST contract such that all CST transactions stop, use the `scripts/cst-freeze-token.js` to generate the request that should be issued by the cold wallet:

```
truffle exec ./scripts/cst-freeze-token.js --network=mainnet -d -r "<registry address>"
```

This will result in the following response, which can be plugged into myetherwallet.com with the cold wallet device:
```
truffle exec ./scripts/cst-freeze-token.js --network=rinkeby -d -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535
Data for freezing token for CST (0xf96f2ca367e194ce82b1cb86d4bb495241cac93e):

Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0x771eee160000000000000000000000000000000000000000000000000000000000000001
Estimated gas: 28921
```

You can use the script `scripts/system-info.js` to confirm that the token is frozen.

To then unfreeze the token so that CST transactions can resume, use the `scripts/cst-unfreeze-token.js` to generate the request that should be issued by the cold wallet:

```
truffle exec ./scripts/cst-unfreeze-token.js --network=mainnet -d -r "<registry address>"
```

This will result in the following response, which can be plugged into myetherwallet.com with the cold wallet device:
```
truffle exec ./scripts/cst-unfreeze-token.js --network=rinkeby -d -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535
Data for unfreezing token for CST (0xf96f2ca367e194ce82b1cb86d4bb495241cac93e):

Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0x771eee160000000000000000000000000000000000000000000000000000000000000000
Estimated gas: 28857
```

You can use the script `scripts/system-info.js` to confirm that the token is unfrozen.

### Freezing CST Account
In order to freeze a specific CST account ot prevent that account from buying, receiving, or sending CST, use `scripts/cst-freeze-account.js` to generate the request that should be issued by the cold wallet:

```
truffle exec ./scripts/cst-freeze-account.js --address="<address to freeze>" --network=rinkeby -d -r "<registry address>"
```
This will result in the following response, which can be plugged into myetherwallet.com with the cold wallet device:
```
truffle exec ./scripts/cst-freeze-account.js --address=0x395d155505432d55a8d8ba9c6c49f8211b65d609 --network=rinkeby -d -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535
Data for freezing account 0x395d155505432d55a8d8ba9c6c49f8211b65d609 for CST (0xf96f2ca367e194ce82b1cb86d4bb495241cac93e):

Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0xe724529c000000000000000000000000395d155505432d55a8d8ba9c6c49f8211b65d6090000000000000000000000000000000000000000000000000000000000000001
Estimated gas: 107996
```
You can use the script `scripts/system-info.js` to confirm that the account is frozen.

To then unfreeze the account, use the `scripts/cst-unfreeze-account.js` script to generate the request that should be issued by the cold wallet:
```
truffle exec ./scripts/cst-unfreeze-account.js --address="<address to freeze>" --network=rinkeby -d -r "<registry address>"
```
This will result in the following response, which can be plugged into myetherwallet.com with the cold wallet device:
```
truffle exec ./scripts/cst-unfreeze-account.js --address=0x395d155505432d55a8d8ba9c6c49f8211b65d609 --network=rinkeby -d -r 0x9f0055eb73e36973594634cd65fab48a6aa11535
Using network 'rinkeby'.

Using registry at 0x9f0055eb73e36973594634cd65fab48a6aa11535
Data for unfreezing account 0x395d155505432d55a8d8ba9c6c49f8211b65d609 for CST (0xf96f2ca367e194ce82b1cb86d4bb495241cac93e):

Address: 0xf96f2ca367e194ce82b1cb86d4bb495241cac93e
Data: 0xe724529c000000000000000000000000395d155505432d55a8d8ba9c6c49f8211b65d6090000000000000000000000000000000000000000000000000000000000000000
Estimated gas: 92932
```
You can use the script `scripts/system-info.js` to confirm that the account is frozen.
