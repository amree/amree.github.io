---
title: "Subtrans SLRU Thrashing on PostgreSQL"
date: 2025-12-18T07:36:59+08:00
tags: [postgresql]
toc: true
typora-copy-images-to: ../../static/images/posts/${filename}
typora-root-url: ../../static
---

I had to look into this challenge recently and I think it's a complicated subject due to gaps in my own PostgreSQL internal knowledge.

Why am I even talking about this topic? 

Recently, we saw spikes for these two metrics on ALL of our DB replicas at the exact same time:

* <abbr title="A process is waiting to access the simple least-recently used (SLRU) cache for a subtransaction.">LWLock:SubtransBuffer</abbr>
* <abbr title="A process is waiting for I/O on a simple least-recently used (SLRU) buffer for a subtransaction">LWLock:SubtransSLRU</abbr>

Based on that incident, I started to dive deep into the issue to understand what happened. Additionally, I'm pretty sure I will forget the nuances of this problem in the future, so I might as well write what I understood. 

Be aware that this is written by a dev who is not a database administrator. So, it'd be great if anyone can correct me if there's anything wrong or needs to be improved. You can do that by replying to my [X post](#) about this article.

With those disclaimers out, let's get into it.

<!--more-->

If you search for this topic, two articles were in the top:

* [PostgreSQL subtransactions considered harmful](https://v2.postgres.ai/blog/20210831-postgresql-subtransactions-considered-harmful#problem-4-subtrans-slru-overflow)
* [Why we spent the last month eliminating PostgreSQL subtransactions](https://about.gitlab.com/blog/why-we-spent-the-last-month-eliminating-postgresql-subtransactions/)

Both are related as I think GitLab worked with PostgresAI to resolve their issue. So, both articles were my main references.

After going back and forth reading those "advanced" articles, I decided to use Claude to help me build the basic knowledge so I could understand them better. Claude gave me these topics to start:

1. **Tuple Visibility Basics** — How PostgreSQL decides if a row is visible
2. **XID Horizon** — What it is and why a pinned horizon is dangerous
3. **Subtransactions** — How they work and why they create Subtrans entries
4. **Subtrans SLRU Thrashing** — Putting it all together

To be clear, I also Googled what Claude gave me since I don't trust AI 100%. I will try to add as many references as possible to confirm what I learnt.

My post is tailored towards Postgres v15 on RDS. I tried not to include too much changes from older versions.

## Tuple Visibility Basics

### What is a tuple?

A tuple is a row in a PostgreSQL table. When you insert a row, PostgreSQL stores it as a tuple on disk.

```sql
CREATE TABLE users (
  id serial PRIMARY KEY,
  name text
);

INSERT INTO users (name) VALUES ('Alice');
```

This creates one tuple (row).

### Hidden system columns

Every tuple has hidden columns that PotgreSQL uses internally. The key ones for visibility are `xmin` and `xmax`:

```sql
INSERT INTO users (name) VALUES ('Bob');

SELECT xmin, xmax, id, name FROM users;
  xmin  | xmax | id |  name
--------+------+----+-------
  1001  |    0 |  1 | Alice
  1002  |    0 |  2 | Bob
```

`xmin` = The transaction ID (XID) that created this tuple

`xmax` = The transaction ID that deleted or updated this tuple (0 if still live). This is why dead tuples stick around until VACUUM

### What is an XID

XID (Transaction ID) is a running number that increments globally for every new transation. XID are never reused within a <span class="sidebar-trigger" data-sidebar="sidebar-wraparound">wraparound</span> cycle. If a transaction aborts, it's XID is gone:

```
XID 1000 → Transaction A starts
XID 1001 → Transaction B starts
XID 1002 → Transaction C starts
XID 1001 → Transaction B aborts
```

Next transaction gets XID 1003, not 1001.

### Why visibility checking exists

PostgreSQL uses <abbr title="Multi-Version Concurrency Control">MVCC</abbr> which means multiple verions of a row can exists simulataneously. When you run a `SELECT`, PostgreSQL must decide: **"Should this transaction see this tuple?"**

For an example:

```
Transaction A (XID 1000)              Transaction B (XID 1001)
─────────────────────────────────     ─────────────────────────────────────
BEGIN;
                                      BEGIN;
                                      INSERT INTO users VALUES (3, 'Joe');
SELECT * FROM users;
-- Joe NOT visible
-- (B hasn't committed yet)
                                      COMMIT;
SELECT * FROM users;
-- Joe IS VISIBLE
```

For this case, Joe is visible because we are using the default isolation level which is `READ COMMITTED`. There are more <span class="sidebar-trigger" data-sidebar="sidebar-isolation-levels">isolation levels</span> in PostgreSQL.

### The visibility check

For each tuple, PostgreSQL asks: "Is this tuple visible to me?"

This requires knowing the status of the transaction that created the tuple. PostgreSQL tracks this in two places:

* **ProcArray** - shared memory listing all currently running transactions
* **CLOG** (commit log) - permanent record of finished transactions (on disk, cached in memory)

### Two-step visibility check

```
Tuple xmin = 1001
      │
      ▼
Step 1: Is 1001 in ProcArray?
      │
      ├── Yes → still running → not visible (stop here)
      │
      └── No → transaction finished, go to step 2
               │
               ▼
         Step 2: Check CLOG[1001]
               │
               ├── COMMITTED → visible
               └── ABORTED → not visible
```

`ProcArray` is the quick check for "is it running right now"?

`CLOG` is the permanent record of "how did it end?"

### Snapshots: avoiding repeated ProcArray checks

PostgreSQL doesn't check `ProcArray` for every tuple as that would be slow. `ProcArray` is a shared memory protected by locks.

Instead, PostgreSQL takes a snpashot once (per transaction or statement, depeneding on the isolation level). The snapshot is a local copy containing:

* xmin - Earliest XID still running
* xmax - Next unassigned XID
* xip_list - All active XIDs between `xmin` and `xmax`

```
Snapshot taken at statement start:
┌─────────────────────────────────┐
│ xmin: 1000  (oldest running)    │
│ xmax: 1005  (next to assign)    │
│ xip_list: [1000, 1001, 1003]    │
└─────────────────────────────────┘

"XIDs 1000, 1001, and 1003 are still running"
"XIDs 1002 and 1004 finished (need CLOG check)"
"XIDs >= 1005 don't exist yet"
```

For each tuple, PostgreSQL compares against this local snapshot:

```
Tuple xmin = 1002
      │
      ▼
Is 1002 in my xip_list? → No
Is 1002 >= snapshot xmax? → No
Is 1002 < snapshot xmin? → No
      │
      ▼
Transaction 1002 finished before my snapshot.
Check CLOG for final status.
```

We always see our own uncommited changes, regardless of snapshot.

### Hint bits: avoiding repeated CLOG checks

CLOG lookups are fast (usually cached), but why repeat them? After checking CLOG, PostgreSQL stamps the result directly on the tuple header as **hint bits**:

```
First read of tuple:
  → No hint bit set
  → Check CLOG → COMMITTED
  → Set XMIN_COMMITTED hint bit on tuple

Second read of tuple:
  → Hint bit already set
  → Skip CLOG entirely
```

Hint bits are an optimization, not a correctness requirement. If they are missing, PostgreSQL just checks CLOG again.

Tuple header infomask bits ([source](https://github.com/postgres/postgres/blob/REL_15_15/src/include/access/htup_details.h)):

```c
#define HEAP_XMIN_COMMITTED     0x0100  /* t_xmin committed */
#define HEAP_XMIN_INVALID       0x0200  /* t_xmin invalid/aborted */
#define HEAP_XMAX_COMMITTED     0x0400  /* t_xmax committed */
#define HEAP_XMAX_INVALID       0x0800  /* t_xmax invalid/aborted */

#define HEAP_XMIN_FROZEN        (HEAP_XMIN_COMMITTED | HEAP_XMIN_INVALID)
```

![visibility-check](/images/posts/subtrans-slru-thrashing-on-postgresql/visibility-check.jpg)

### CLOG (Commit Log)

CLOG is a simple mapping: **XID → status**

Each transaction has one of four states (stored as 2 bits):

| Status        | Value | Meaning                                        |
| ------------- | ----- | ---------------------------------------------- |
| IN_PROGRESS   | 00    | Transaction still running (default)            |
| COMMITTED     | 01    | Transaction committed successfully             |
| ABORTED       | 10    | Transaction rolled back                        |
| SUB_COMMITTED | 11    | Subtransaction committed (parent might not be) |

#### Where CLOG lives

**In memory:** Shared memory pages (8KB each), used during normal operation

**On disk:** `pg_xact/` directory (called `pg_clog` before PostgreSQL 10), written at checkpoints and shutdown

```
ls -la $PGDATA/pg_xact/
# 0000  0001  0002  ...
```

#### CLOG is indexed by XID

The XID (a 32-bit integer) is not stored in the CLOG—it's used as the index to locate the 2-bit status:

```
Page number = XID ÷ 32,768
Byte in page = (XID % 32,768) ÷ 4
Bit position = (XID % 4) × 2
```

To find XID 1000's status, PostgreSQL calculates the page, byte, and bit offset directly. No lookup table needed.

#### How CLOG slots are allocated

CLOG pages are zeroed on creation. Since IN_PROGRESS = 00, new slots automatically have the correct initial state without any write.

```
CLOG page created (all zeros):
┌─────────────────────────────────────┐
│ 1000: 00 (IN_PROGRESS) ← just zeros │
│ 1001: 00 (IN_PROGRESS) ← just zeros │
│ 1002: 00 (IN_PROGRESS) ← just zeros │
└─────────────────────────────────────┘
```

**When you run BEGIN:**

- No XID assigned yet
- CLOG not touched

**When the transaction first modifies data:**

- XID assigned (32-bit integer)
- Transaction registered in ProcArray (shared memory list of running transactions)
- CLOG page extended if needed (but slot not written—it's already zero)

**When you COMMIT or ABORT:**

- CLOG slot written (01 for COMMITTED or 10 for ABORTED)
- Transaction removed from ProcArray

```
XID 1000 commits:
┌─────────────────────────────────────┐
│ 1000: 01 (COMMITTED) ← written now  │
│ 1001: 00 (IN_PROGRESS) ← still zero │
│ 1002: 00 (IN_PROGRESS) ← still zero │
└─────────────────────────────────────┘
```

Note: Read-only transactions never get an XID and never touch CLOG.

#### CLOG binary layout

2 bits per transaction status, packed 4 per byte. The XID is the index, not stored:

```
One byte (8 bits) holds statuses for 4 transactions:

Byte N: [status₀][status₁][status₂][status₃]
            01       01       10       00
            C        C        A        IP

C  = COMMITTED (01)
A  = ABORTED (10)
IP = IN_PROGRESS (00)
```

8KB page = 8,192 bytes × 4 statuses/byte = **32,768 transaction statuses per page

### CLOG and SLRU

CLOG lives on disk, but PostgerSQL caches pages in memory using an SLRU cache.

| Property            | Value      |
| ------------------- | ---------- |
| Buffer count        | 128        |
| Bits per XID        | 2          |
| XIDs per 8KB page   | 32,768     |
| Total XIDs in cache | <span class="sidebar-trigger" data-sidebar="sidebar-xid-calculation">~4 million</span> |

### How SLRU Cache works

```
Request: "What's the status of XID 50000?"
      │
      ▼
Calculate page: 50000 ÷ 32,768 = page 1
      │
      ▼
Is page 1 in cache?
      │
      ├── Yes (cache hit) → read from memory
      │
      └── No (cache miss) → evict least recently used page
                            load from disk into cache
                            read from memory
```

#### SLU cache is a working set window

The cache can't hold all <span class="sidebar-trigger" data-sidebar="sidebar-total-xid-calculation">4.3 billion</span> XIDs:

```
All XIDs:         ~131,000 pages needed (4.3B ÷ 32,768)
Cache holds:      128 pages
```

adsf







## XID Horizon

## Subtransactions

## Subtrans SLRU Thrashing

## References

* [AWS User Guide - LWLock:SubtransSLRU (LWLock:SubtransControlLock)](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/wait-event.lwlocksubtransslru.html)
* [PostgreSQL subtransactions considered harmful](https://v2.postgres.ai/blog/20210831-postgresql-subtransactions-considered-harmful#problem-4-subtrans-slru-overflow)
* [Why we spent the last month eliminating PostgreSQL subtransactions](https://about.gitlab.com/blog/why-we-spent-the-last-month-eliminating-postgresql-subtransactions/)
* [Demystifying the Internals of PostgreSQL - Chapter 5](https://dev.to/nilelazarus/demystifying-the-internals-of-postgresql-chapter-5-2pe4)
* [PostgreSQL 14 Internals](https://postgrespro.com/community/books/internals)
* Temp
  * https://brandur.org/postgres-atomicity
  * https://postgrespro.com/blog/pgsql/5967899


<!-- Sidebar data -->

{{< sidebar id="wraparound" title="Wraparound" >}}
In PostgreSQL, a transaction ID takes 32 bits. Four billions seems to be quite a big number, but it can be exhausted very fast if the system is being actively used. For example, for an average load of 1,000 transactions per second (excluding virtual ones), it will happen in about six weeks of continuous operation.

Once all the numbers are used up, the counter has to be reset to start the next round (this situation is called a "wraparound"). But a transaction with a smaller ID can only be considered older than another transaction with a bigger ID if the assigned numbers are always increasing. So the counter cannot simply start using the same numbers anew after being reset.

— *PostgreSQL 14 Internals*, 7.1

{{< /sidebar >}}

{{<sidebar id="isolation-levels" title="Isolation Levels">}}

Sources:

- [Transaction Isolation in Postgres](https://medium.com/@darora8/transaction-isolation-in-postgres-ec4d34a65462)
- [Transaction Isolation from PostgreSQL Official Docs](https://www.postgresql.org/docs/15/transaction-iso.html)

In his article, Dhruv Arora explains how PostgreSQL manages transaction isolation to balance data consistency with performance. While the SQL standard defines four isolation levels, Postgres implements three: **Read Committed**, **Repeatable Read**, and **Serializable**.

Here is a quick summary of the core concepts:

### 1. Read Committed (The Default)

* **Behavior:** Each query within a transaction sees a "snapshot" of the data at the moment the **query** starts.
* **Avoids:** **Dirty Reads** (reading uncommitted data from other transactions).
* **Known Issues:** **Non-repeatable Reads:** If you run the same query twice in one transaction, the data might change if another transaction commits in between.
* **Phantom Reads:** New rows added by other transactions can appear in the middle of your transaction.

### 2. Repeatable Read

* **Behavior:** The transaction sees a snapshot of the data from the moment the **first query** in the transaction starts. This is known as *Snapshot Isolation*.
* **Avoids:** Both **Non-repeatable Reads** and **Phantom Reads**.
* **Key Benefit:** Successive `SELECT` commands within the same transaction will always see the exact same data, even if other transactions commit changes.
* **Known Issues:** It is still vulnerable to **Serialization Anomalies** (like "Write Skew").

### 3. Serializable

* **Behavior:** The strictest level. It uses **Serializable Snapshot Isolation (SSI)** to monitor transactions and ensure that the result of concurrent transactions is the same as if they had run one after another (sequentially).
* **Avoids:** **Serialization Anomalies / Write Skew.**
* *Example of Write Skew:* Two transactions both read a set of data and then update overlapping parts of it. In Repeatable Read, both might succeed but leave the database in a state that wouldn't happen if they ran one-by-one.

* **Trade-off:** If Postgres detects a conflict that would break "serializability," it will **abort and roll back** one of the transactions. The application must be designed to retry failed transactions.

### Comparison Table

| Phenomenon | Read Committed | Repeatable Read | Serializable |
| --- | --- | --- | --- |
| **Dirty Read** | Not Possible | Not Possible | Not Possible |
| **Non-repeatable Read** | Possible | Not Possible | Not Possible |
| **Phantom Read** | Possible | Not Possible | Not Possible |
| **Serialization Anomaly** | Possible | Possible | Not Possible |

**The Bottom Line:** Use **Read Committed** for general tasks where slight inconsistencies between queries are okay. Use **Repeatable Read** for reporting where you need a consistent view. Use **Serializable** for complex logic where total mathematical correctness is required and you are prepared to handle transaction retries.
{{</sidebar>}}

{{<sidebar id="xid-calculation" title="XID Calculation">}}
**Step 1: XIDs per page**
- Page size: 8KB = 8,192 bytes = 65,536 bits
- Bits per XID: 2
- XIDs per page: 65,536 ÷ 2 = **32,768 XIDs**

**Step 2: Total XIDs in cache**
- Buffer count: 128
- Each buffer holds one 8KB page
- Total: 128 × 32,768 = **4,194,304 XIDs** (~4 million)

Or more compactly:

$$\frac{128 \text{ buffers} \times 8,192 \text{ bytes} \times 8 \text{ bits/byte}}{2 \text{ bits/XID}} = 4,194,304 \text{ XIDs}$$
{{</sidebar>}}

{{<sidebar id="total-xid-calculation" title="Total XID Calculation">}}
The 4.3 billion comes from the XID data type itself:

**XID is a 32-bit unsigned integer**

$$2^{32} = 4,294,967,296 \approx 4.3 \text{ billion}$$

This is the total XID space before wraparound occurs—the reason PostgreSQL needs VACUUM to freeze old tuples and reclaim XIDs.

So the contrast is:

| | Size |
|---|---|
| Total XID space | ~4.3 billion (2³²) |
| SLRU cache window | ~4 million (2²²) |
{{</sidebar>}}
