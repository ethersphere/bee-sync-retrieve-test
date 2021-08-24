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
Starting at 2021-08-24 11:49
Random seed: 1c5afc5d7c9c806cb839755fd6436b56caa8ddac45c839124d4da900b26d1fa7
Timeout 600 secs

Bee https://bee-2.example.com uploaded, bytes: 1c5afc5d7c9c806cb839755fd6436b56caa8ddac45c839124d4da900b26d1fa7, hash 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
Bee https://bee-2.example.com finished, elapsed time 1 secs, hash retrieved from 1/3, hash 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
Bee https://bee-0.example.com finished, elapsed time 233 secs, hash retrieved from 2/3, hash 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
Bee https://bee-3.example.com finished, elapsed time 244 secs, hash retrieved from 3/3, hash 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
Hash retrieved from all bees, elapsed time 244 secs, hash 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
```

This means that the script randomly selected `bee-2` from `BEE_HOSTS` to upload a single chunk, that has the hash `10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c`. Also it immediately succeeded in downloading the chunk from `bee-2` and then it waits for the other nodes to retrieve the chunk. Then after waiting 233 and 244 seconds it managed to download it from `bee-0` and `bee-3` respectively. After that it waits until it manages to download from all hosts (in our example for `bee-1`).

### Checking the results

Sometimes it is useful to check if a hash is available on several nodes. For example if the test script run is interrupted or happens in a different node. There is a `check` script for that which expects the hash as an argument:

```
node check 10744a2546c11f6ae58058872ced84f3474c2dab19fe3e06868c26e075a7d77c
```

### Report file

There is a report generated after running the script. The report is appended to the `report.csv` file which is a CSV file. The columns are the following:

start date in UTC,seed in hex,random bytes in hex,time of retrieval of 1st node,2nd node,3rd node,etc.

