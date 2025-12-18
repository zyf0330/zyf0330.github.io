---
layout: post
title: 'Redis latency 和 ops 的关系.md'
date: 2025-12-18
category: 技术文章
---

个位数的 ops 会观察到 latency 较高

比如 3-5 ops 的 set 命令观测到的 latency 是 40ms 左右
![](/attachments/Pasted%20image%2020251218151110.png)

这是由于

> Warm-up Effects (Very Common)
> As traffic increases, Redis often becomes more efficient:
> - CPU cache warming: Frequently accessed code paths and data structures stay hot in L1/L2 cache.
> - Memory residency: Keys are already in RAM; fewer page faults.
> - JIT / branch prediction stabilization (especially visible under sustained load).

增加调用量，latency 就会降低

