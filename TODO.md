high
----
[x] flash new target
[x] jump back to discovery bootstrap mode
[x] flash target application hex
[x] flash target upgrade and bootloader hex
[x] jump to imago bootstrap mode
[x] jump to classic bootstrap mode
[X] receive block found events
[ ] wait for reconnect
[ ] wait for disconnect
[X] detect bootstrap vs classic bluetooth
[X] flash bootstrap to bluetooth block
[X] flash bluetooth block in classic protocol
[X] detect incompatible avr block types in upgrade.js
[X] detect classic vs imago bluetooth

medium
------
[ ] add back pressure to block message streams with backoffs when buffers are full
[X] move block getters into base strategy
[X] add remaining virtual methods to base strategy
[X] command queue timer keeps running preventing clean shutdowns, so disable timer when no commands

low
---
[ ] merge classic and imago program.js into single usable object
[ ] fix bug in tcp network cubelet client (when multiple clients running?)
[ ] think about how to set strategy in the middle of an async call chain keeping scope
[ ] break out getting block types into classic strategy
[X] upsert neighbors immediately
[X] consistency between getBlocks, getAllBlocks
[X] eliminate callbacks on command writes
