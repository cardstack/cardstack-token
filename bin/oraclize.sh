#!/bin/bash

CURRENT_DIR=`pwd`
cd `dirname $0`
DIR=`pwd`

ETHEREUM_BRIDGE="$DIR/../node_modules/ethereum-bridge"

INSTANCES="`ls $ETHEREUM_BRIDGE/config/instance/*.json 2>/dev/null`"

mkdir -p "$ETHEREUM_BRIDGE/database/tingodb"
cd "$ETHEREUM_BRIDGE"

if [ -n "$INSTANCES" ]; then
  node bridge.js localhost:8545 -a 49 --dev --non-interactive --instance latest
else
  node bridge.js localhost:8545 -a 49 --dev --non-interactive
fi

cd $CURRENT_DIR
