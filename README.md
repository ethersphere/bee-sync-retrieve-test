# Bee Sync & Retrieve Test

This is a small test script to evaluate the reliability of chunk push sync & retrieval of Bee.

The basic idea is that it uploads a random chunk to one node and then it tries to fetch the hash of that chunk from a list of nodes until it successfully retrieves the chunk from all nodes.

# Usage

This is a Node.js project. Node v12+ is recommended.

## Installation

```
npm install
```

## Usage

The scripts expects a comma separated list of Bee nodes to be provided in an environment variable. By default it is the address of the locally running Bee node (`http://localhost:1633`).

```
export BEE_HOSTS=https://bee-0.example.com/,https://bee-1.example.com/,https://bee-2.example.com/,https://bee-3.example.com/
```

### Running the test

```
node test
```

This will upload a single random chunk to one node and wait until the chunk is retrieved from all the nodes.

### Understanding the output

Usually after starting the script the output looks like this:

```
Bee https://bee-2.example.com uploaded, hash a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
{
  numHashes: 1,
  hashes: [
    'a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce'
  ]
}
Bee https://bee-2.example.com finished, elapsed time 1 secs, hash a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
Bee https://bee-0.example.com finished, elapsed time 233 secs, hash a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
Bee https://bee-3.example.com finished, elapsed time 244 secs, hash a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
```

This means that the script randomly selected `bee-2` from `BEE_HOSTS` to upload a single chunk, that has the hash `a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce`. Then it prints that `numHashes` is 1, so there is only one chunk uploaded. Also it immediately succeeded in downloading the chunk from `bee-2` and then it waits for the other nodes to retrieve the chunk. Then after waiting 233 and 244 seconds it managed to download it from `bee-0` and `bee-3` respectively. After that it waits until it manages to download from all hosts (in our example for `bee-1`).

### Running multiple tests in parallel

It's possible to run the tests with multiple chunks in parallel by providing the number of chunks as an argument:

```
node test 10
```

This will generate 10 random chunks and upload them to random nodes and then it tries to download them in parallel until the retrieval from all nodes is succesful. In that case the script prints a message like this:

```
Hash retrieved, elapsed time 347 secs, hash a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
```

### Checking the results

Sometimes it is useful to check if a hash is available on several nodes. For example if the test script run is interrupted or happens in a different node. There is a `check` script for that which expects the hash as an argument:

```
node check a0bdcde5c843baa3a1af6f07173c9f5a2f75e29f2f4729deae3223148b7082ce
```

