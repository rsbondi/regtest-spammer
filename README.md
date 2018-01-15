# regtest-spammer
Generate random transactions to get started with bitcoin regtest

## Why

The bitcoin core client comes with the `--regtest` option, it also allows you to use the `generate` command to generate blocks.  This is a start but it only generates blocks with one transaction each.  This utility allows you to generate random transactions to have more complete blocks to play with

## Usage

`node index.js [-options...]`

## options

| Flag | Description                         |
| ------- | -----------                         |
| -config | path to config file, this is where your bitcon.conf file is, default: `HOME/.bitcoin/bitcoin.conf`|
| -host   | default `127.0.0.1`                   |
| -port   | default `18332` override if using another port for regtest | 
| -nblocks| the number of blocks to generate, default: `105` |
| -ntx    | the number of transactions to generate (may generate less if it stops to mine), default: `30`|
| -fee    | fee to use for transactions, fixed amout for all transactions, default `0.0002` |