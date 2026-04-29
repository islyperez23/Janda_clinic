#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
exec ~/Desktop/HMS/dist/linux-unpacked/hms-portal --no-sandbox
