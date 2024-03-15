---
layout: post
title: '如何利用好 MongoDB 复合索引 Combound Index.md'
date: 2023-04-11
category: 技术文章
---

# 什么是复合索引

> Mongo 官方文档在此镇楼   [https://docs.mongodb.com/manual/core/index-compound/](https://docs.mongodb.com/manual/core/index-compound/)  

复合索引就是用 Document 的多个字段共同组成的索引，因此相对与单字段索引，它能为多个字段的查询和排序提供支持。

# 创建复合索引

这个相信大家都很熟悉了，在   `createIndex`   方法中指定多个字段和其顺序。下面会着重介绍这俩个顺序的作用，也是复合索引的精髓所在

# 复合索引如何起作用

## 对于查询

当使用多个字段作为条件进行组合查询时，会利用到能按索引字段顺序重叠最多的索引，即前缀 prefix 匹配最多的索引，查询后的结果，如果还有其他字段需要匹配，会使用无索引的匹配方式。

举个例子，对于这样一个索引   `{a: 1, b: 1, c: 1}`   

1. 如果有这样一个查询条件   `{c: v1, a: v2, b: v3}`   ，那么就会利用这个索引的全部能力，直接查出结果。
1. 如果有这样的查询条件   `{a: v2, b: v1}`   ，那么会利用这个索引的一部分能力，也就是它的前缀   `{a: 1, b: 1}`   ，直接查出结果
1. 对于查询条件   `{a: v1, c: v2}`   ，只会利用这个索引的前缀   `{a: 1}`   查出中间结果，然后再对其进行条件   `{c: v2}`   的过滤。注意：此时即使有   `c`   的单字段索引也不会生效
1. 对于查询条件   `{b: v2, c: v1}`   或   `{c: v1}`   等，不匹配索引前缀的条件，不会用到这个索引。 


看了这些例子，大家应该能明白它是怎么工作的了。

当查询时，查询条件内的各个字段顺序是无所谓的，但是索引的顺序决定了它的所有前缀集合。

> 参考   [https://docs.mongodb.com/manual/core/index-compound/#std-label-compound-index-prefix](https://docs.mongodb.com/manual/core/index-compound/#std-label-compound-index-prefix)  

## 对于排序

当使用多个字段作为排序条件时，和查询一样，也是利用前缀匹配最适合的索引。

这里有个额外需要注意的点是，排序条件的字段，其顺序必须和索引前缀字段的顺序一致，且各个字段从前到后的排序顺序和索引各字段的排序顺序，整体相同或相反。

举例来说，对于这样一个索引   `{a: 1, b: -1}`   

1. 如果排序条件是   `{a: 1, b: -1}`   或   `{a: -1, b: 1}`   ，就能利用到这个索引来排序
1. 如果排序条件是   `{b: -1}`    或   `{b: -1, a: 1}`   ，就不能利用这个索引。因为字段顺序和索引字段没有相同的前缀顺序。
1. 如果排序条件是   `{a: 1, b: 1}`   或   `{a: -1, b: -1}`   ，也不能利用到这个索引。因为字段的排序顺序和索引的整体不一致。


因此对于排序来说，索引字段的顺序和字段的排序顺序都很重要。

> 参考   [https://docs.mongodb.com/manual/core/index-compound/#sort-order](https://docs.mongodb.com/manual/core/index-compound/#sort-order)  

## 同时查询和排序

当需要同时进行查询和排序时，查询和排序分别会有两组字段条件，如果要利用到索引，要么各自单独去匹配索引，要么  **查询字段+排序字段**  要和索引前缀相匹配。这里只讲后者

还是举个例子，对于索引   `{a: 1, b: 1, c: -1}`   

1. 查询   `{a: v1}`   排序   `{b: 1, c: -1}`   可以利用到索引
1. 查询   `{b: v1}`   的话，是利用不到索引的，排序自己得单独去利用索引，参照上一节
1. 查询   `{a: v1}`   的话，排序  `{b: 1}`   和   `{b: 1, c: -1}`   都可以利用索引，也就是所谓的  **查询字段+排序字段**   


> 参考   [https://docs.mongodb.com/manual/tutorial/sort-results-with-indexes/#sort-and-non-prefix-subset-of-an-index](https://docs.mongodb.com/manual/tutorial/sort-results-with-indexes/#sort-and-non-prefix-subset-of-an-index)  

# 解释复合索引的原理

看了上面的介绍和举例，大家对于复合索引如何使用，应该有了一定的掌握。这里来解释一下复合索引它的原理和本质，来帮助从根本上理解它为何能如此工作。

先回顾一下单字段索引，当对某个字段建立索引后，其实做了两件事：

1. 通过索引键，指定要对某个字段的所有值建立一个  **索引数据**  ，使得能快速的通过值来查到对应的文档
1. 通过索引键的值，来确认文档的  **排序顺序**  （这个顺序也在索引数据中），使得通过值能快速确定多个文档的相对顺序


然后回到复合索引，复合索引可以指定多个字段和多个排序顺序，其本质就是将多个字段，按照上面的规则，从前到后一个接一个建立好索引数据和相应的排序顺序。这也是为什么复合索引的多个字段是有顺序的。

# 索引交集 Index Intersection

最后我们提一句索引交集。

>   [https://docs.mongodb.com/manual/core/index-intersection/#index-prefix-intersection](https://docs.mongodb.com/manual/core/index-intersection/#index-prefix-intersection)  

索引交集和复合索引有些相同之处在于，它也是能为多个字段作为查询条件提供支持的。不同之处在于，它利用的是多个索引。

如果一个查询条件里，每个字段或每一些字段各自能匹配到各自的索引，那么它们会分别利用索引来获取结果，然后取交集。

同时官方也提到，这个能力并不能取代复合索引，因为在各种情况下它的效果都不能得到保证。

我们这里也不多展开更深的研究，只要知道，如果能明确使用复合索引的地方，就使用它，总是能得到最好的效果。

# 结尾

相信看了这一篇，对于复合索引大家都应该有一定的了解了。

附一个 MongoDB 官方的最佳实践   [https://www.mongodb.com/blog/post/performance-best-practices-indexing](https://www.mongodb.com/blog/post/performance-best-practices-indexing)   供大家学习

# 补充
后来一次经验，让我对复合索引的性能有了更多的认识。
> 这里主要关注 explain 的 `seeks` 属性，相关介绍请参考 mongo 文档。

当有多个复合索引时，不一定是覆盖 query 字段最多的复合索引胜出。
考虑一种情况，复合索引中某个字段需要范围查询，那么从这个字段开始，查询就会对每个值 seek 到一个新的索引位置，然后对后续字段继续索引匹配。这个范围越大，就会导致 `seeks` 越大，影响查询速度。
因此最好把需要进行范围查询的字段放到复合索引多个字段的靠后位置，将全等匹配字段放到靠前位置。

