---
layout: post
title: '失败的性能优化——使用 $facet 实现 paging.md'
date: 2024-04-09
category: 技术文章
---

> 基于 mongo 4.4 和 6 版本均测试过

精神比较疲惫，长话短说了，细节不描述太多。

findByPageIndex 功能：查询指定页码的数据，并且返回总数据量。

目前的实现，并行两个查询，一个 find page，另一个 count。
得知 $facet 这一操作符后（可以基于一个数据集并行进行多个不同聚合操作），想到如果使用它来实现 findByPageIndex，初始数据集只需要查询一次，在其基础上分别进行 paging 和 count，应该会更快。

实现后经过实际测试，发现有一个点没有考虑到，实际性能很差。
原来的 find 中，sort + skip/limit是有优化的，只会返回限定数量的数据。但是由于 facet 需要将完整数据传递给 count，将 skip/limit 阶段分割了，这一优化失效，导致全量的数据跨 stage 传递，这性能很差。
> 而新的 count stage 相比于原来的 count，性能倒是差不多。


什么情况可以抹平这个性能差距呢？除非是 match stage 花费大量时间，从而产生很少的数据，但是这种场景又没必要分页。

所以这个优化尝试是失败的。

附上 facet 和普通的 sort + skip/limit 的 explain 对比
![](/attachments/Pasted%20image%2020240409174815.png)

![](/attachments/Pasted%20image%2020240409174833.png)

#### 关于 explain 细节解释
filter 的结果要送给 facet ，其中有 paging 和 count 两个过程。
其中 filter 的 stage 是 cursor，是一次独立的取数据查询，有独立的 query planner 。
facet 是高级操作符，必须构建好数据对象再送进去， filter 结果的构建就是性能开销所在。不像普通 find 中的 collscan、sort、skip、limit，可以直接在原始数据上进行。

