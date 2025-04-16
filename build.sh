export NODE_ENV=production
tools/bin/mage dev:dbStop
sudo tools/bin/mage dev:dbErase 

tools/bin/mage js:deps
tools/bin/mage js:build
~/go/bin/goreleaser --snapshot -f .goreleaser.snapshotunsigned.yml --rm-dist
