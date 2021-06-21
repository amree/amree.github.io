+++
title = "Code Reading Calculate Wbnb per Token"
date = "2021-06-21T18:05:36+08:00"
keywords = ["cryptocurrency"]
+++

# Code Reading: Calculate WBNB per Token

Given a token, how do calculate its value against WBNB?

Someone already solved this for us, but let us try to understand what the code is actually doing.

<!--more-->

```javascript
// src/exchange/pricing.ts

/**
 * Search through graph to find derived BNB per token.
 * @todo update to be derived BNB (add stablecoin estimates)
 **/
export function findBnbPerToken(token: Token): BigDecimal {
  if (token.id == WBNB_ADDRESS) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHex() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHex());
      if (pair.token0 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
        let token1 = Token.load(pair.token1);
        return pair.token1Price.times(token1.derivedBNB as BigDecimal); // return token1 per our token * BNB per token 1
      }
      if (pair.token1 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
        let token0 = Token.load(pair.token0);
        return pair.token0Price.times(token0.derivedBNB as BigDecimal); // return token0 per our token * BNB per token 0
      }
    }
  }
  return ZERO_BD; // nothing was found return 0
}
```

Source: [https://git.io/Jno0J](https://git.io/Jno0J)

For this code walkthrough, we will assume that we are passing `CAKE` as the params. More information of this token can be found [here](https://bscscan.com/address/0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82).

```javascript
if (token.id == WBNB_ADDRESS) {
  return ONE_BD;
}
```

This is quiet straightforward. If we are given `WBNB`, then we will just return `1` as the rate. E.g: Given `WBNB`, it will always return `1` as it is the same token. But we are passing `CAKE` here, so, we will be proceeding to the next line.

```javascript
for (let i = 0; i < WHITELIST.length; ++i) {
  // ...
}
```

`WHITELIST` here refers to:

```javascript
let WHITELIST: string[] = [
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
  "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
  "0x55d398326f99059ff775485246999027b3197955", // USDT
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
  "0x23396cf899ca06c4472205fc903bdb4de249d6fc", // UST
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB
  "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // WETH
];
```

Source: [https://git.io/JnKXF](https://git.io/JnKXF)

```javascript
let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
if (pairAddress.toHex() != ADDRESS_ZERO) {
  // ..
}
```

Assuming we are passing `CAKE` token, this means, the code in the loop will only continue if there is no matching pair. The order of the tokens in the pair doesn't really matter in this case.

```javascript
factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
```

We can try this manually with the factory address of PancakeSwap V2 at [BscScan](https://bscscan.com/address/0xca143ce32fe78f1f7019d7d551a6402fc5350c73#readContract). Just scroll to the `getPair` method and input the tokens that we want. If there are multiple pairs with similar tokens, it will return the first one it found based on the index (I may need to check the factory code to confirm this).

Let’s go to the next line of code

```javascript
let pair = Pair.load(pairAddress.toHex());
```

Nothing much here. This will just load the pair that we found earlier to `pair`. However, it is good to know that we will also get extra information such as the `reserveBNB`, `derivedBNB` and others. These information is not available on the network itself but it is something that [subgraph](https://github.com/pancakeswap/pancake-subgraph/) stored. We can see all the attributes [here](https://github.com/pancakeswap/pancake-subgraph/blob/a002a98487d7467bf283b2b9d3c9f7290d50cbd1/src/exchange/factory.ts#L74-L93).

Now let us go to an important piece of the code in the function:

```javascript
if (pair.token0 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
  // ...
}
if (pair.token1 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
  // ...
}
```

As we can see here, the code is trying to find out `token` is in `token0` or `token1`. To those who don't know, we can get the `token0` and `token1` in the pair page at BscScan, an example would be this [page](https://bscscan.com/address/0x0ed7e52944161450477ee417de9cd3a859b14fd0) for `CAKE-WBNB`.

Since we are passing `CAKE` in this walkthrough, it will be found in the first `if` as for the `CAKE-WBNB` pair, the `token0` is equal to `CAKE`. So, that should have solved this part:

```javascript
pair.token0 == token.id
```

Let us move to the second condition:

```javascript
pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)
```

The value of `MINIMUM_LIQUIDITY_THRESHOLD_BNB` is actually `10`. Source is [here](https://git.io/Jn6vL).

But what about `pair.reserveBNB`, what's the value? To answer that, we need to find out where it's actually being set first.

```javascript
// src/exchange/core.ts

pair.reserveBNB =
  pair.reserve0.times(token0.derivedBNB as BigDecimal).plus(
    pair.reserve1.times(token1.derivedBNB as BigDecimal)
  );
```

Source: [https://git.io/Jn6ft](https://git.io/Jn6ft)

Now we need to know where `token0.derivedBNB` is from, which is:

```javascript
// src/exchange/core.ts

let t0DerivedBNB = findBnbPerToken(token0 as Token);
token0.derivedBNB = t0DerivedBNB;
token0.save();

let t1DerivedBNB = findBnbPerToken(token1 as Token);
token1.derivedBNB = t1DerivedBNB;
token1.save();

// ...

pair.reserveBNB =
  pair.reserve0.times(token0.derivedBNB as BigDecimal)
    .plus(
      pair.reserve1.times(token1.derivedBNB as BigDecimal)
     );
```

Source: [https://git.io/Jn6f6](https://git.io/Jn6f6)

Wait, it’s actually calling the same function? Isn’t this going to cause infinite loop? Actually NO, as this function is being called in different time. To be specific, it will be called whenever the contract emit `SYNC` event. So, `derivedBNB` will always be updated with a value when that event happened. Source: [https://git.io/Jn6TR](https://git.io/Jn6TR)

So, we can can assume when `findBnbPerToken` is called, the `derivedBNB` value is already there. This is actually part of the code that confuses me as it feels like the value will never increase. But here is my guest:

   - `pair.reserveBNB`, `token0.derivedBNB` and `token1.derivedBNB` has initial value of `0`
   - If we take an example of `CAKE/WBNB` pair, `findBnbPerToken` will always return `0` for `CAKE` as it doesn't meet the `MINIMUM_LIQUIDITY_THRESHOLD_BNB` until `WBNB` reserve which is also `pair.reserve1` in the pair has more than `MINIMUM_LIQUIDITY_THRESHOLD_BNB` or `10`
   - This also means this code block depends entirely on the `WBNB` or `token1.derivedBNB` to have non zero value at first:

```javascript
// src/exchange/core.ts

pair.reserveBNB = pair.reserve0
    .times(token0.derivedBNB as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedBNB as BigDecimal));
```

Alright, let us go back up again to this condition again:

```javascript
if (pair.token0 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
  // ...
}
if (pair.token1 == token.id && pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)) {
  // ...
}
```

Assuming the second condition has been met, we will go inside that `if`:

```javascript
let token1 = Token.load(pair.token1);
// return token1 per our token * BNB per token 1
return pair.token1Price.times(token1.derivedBNB as BigDecimal);
```

Source: [https://git.io/JniYJ](https://git.io/JniYJ)

I would say the final piece of the code is the most important part here. The first line is just to load the token information and in this case, we are going to load the other token. If the token that we passed (`CAKE`) is in the first position, then we are going to load the other token which is `WBNB` in this case.

Once we got `WBNB` loaded, we can calculate the value of this token agains `WBNB`. I've already explained about `.derivedBNB` attribute before, but for this case, it's quiet straightforward as we are going to pass `WBNB` which will get us `1` as it is `WBNB/WBNB`.

So, we need to figure out the `pair.token1Price` now which is coming from:

```javascript
// src/exchange/core.ts

if (pair.reserve0.notEqual(ZERO_BD))
  pair.token1Price = pair.reserve1.div(pair.reserve0);
else
  pair.token1Price = ZERO_BD;
```

Source: [https://git.io/JniOs](https://git.io/JniOs)

In this case, we want to know the value of `WBNB/CAKE` and we are going to use the `reserve` amount. Reserve amounts can be retrieved from the pair's contract `getReserves` function which can be seen in this pair's [contract](https://bscscan.com/address/0x0ed7e52944161450477ee417de9cd3a859b14fd0#readContract).

After that, we will get the value of `1 WBNB` = `X CAKE`. Do remember the output is in `CAKE` and not `WBNB`. After that we can get of `CAKE` token in `WBNB`  by `X CAKE * CAKE/WBNB`

---

To be honest, I am still not satisfied with this explanation. I will update this post in the future if I have a better way to do it, most probably with a real example. However, I think these are some of the keys that helped me (hopefully it will help you as well):

   - `findBnbPerToken` will produce output of `TOKEN_X/WBNB` with `TOKEN_X` as the argument
   - To simplified this, we can ignore this condition first:

```javascript
pair.reserveBNB.gt(MINIMUM_LIQUIDITY_THRESHOLD_BNB)
```

   - Most of the work will be done on the other token. If `TOKEN_X` is the first one, then we'll be doing calculation on the second token.

Ugh, I’m still not satisfied with this post. Let us consider this post as v0.0.1 😅
