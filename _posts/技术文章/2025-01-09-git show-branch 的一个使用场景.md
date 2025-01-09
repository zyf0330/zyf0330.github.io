---
layout: post
title: 'git show-branch 的一个使用场景.md'
date: 2025-01-09
category: 技术文章
---

git `show-branch` ，这是一个冷门的命令。大多数人的日常开发中，都不会用到它。

这里介绍它的一个使用场景。

考虑多客户定制功能的发布方式。我们使用多分支来承载这个需求，此时有一个  base 分支，同时有一些分支 customer-XXX 分支对应客户定制功能，它们基于 base，分别有各自不同的代码。

起初，customer-A 和 customer-B 面向的是同一个公司的两个部门，所以大部分功能相同，但有一些微小的功能不同。\
经过一段时间的开发，base 和 customer-A 都向前迭代了很多功能，但 customer-B 由于某种原因，在这期间没有任何进展。\
突然，customer-B 被要求重启开发，且希望直接追上 customer-A 的进度。在产品发布层面，不存在严密的跟踪产品功能是否发布的记录，技术主管提出了直接将 customer-A 合并入 customer-B 的方法。\
然而开发者处事严谨，决定向产品确认每一项 customer-A 上具有的定制功能改动是否都需要追加给 customer-B。

此时，使用 `git show-branch base customer-A customer-B`，就可以达成目的。
输出类似下图，具体解释请参考文档。
![](/attachments/Pasted%20image%2020250109104824.png)\
在这个输出中，你只需要找到那些只有 customer-A 上有`+`而在 base 上没有`+`的提交，它们就是专属于 customer-A 的定制功能改动。

然后你就可以生成一份功能改动清单，来向产品确认。

**注意：只有在严格使用 merge 来向分支添加功能时，上述方法才能生效。否则你只能得到一堆具有相同提交信息的不同提交，大概是因为你滥用用了 rebase 或是 cherry-pick**

