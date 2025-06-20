---
layout: post
title: 'nodejs 长时间 GC 导致 EventLoop Lag.md'
date: 2025-06-19
category: 技术文章
---

最近碰到存在内存 gc 压力的应用

## 情况
#### 应用特点
请求量少，但创建对象多，且持续时间在数十秒量级
#### GC 表现
通过 `--trace-gc` 来观察 gc 表现

 大部分对象逃过了 new space 中频繁的 Scavenge GC，进入了 old space 的 Mark-Sweep GC，然后被一次性 GC 掉，造成数十到数百ms的应用停顿（Stop the World）
 mu 倒是不低，始终在0.99以上

#### EventLoop 表现
由于 GC 耗时长，造成了大的 EventLoop lag，也在数十到数百ms

## 办法
#### 提高 GC 频率
尝试通过使用 v8 option `--stress-marking` 来加快 Mark-Sweep GC 频率
降低了耗时，但是增加了 CPU 占用。
> 使用 `--max-old-space` 应该也会产生相同的效果

#### 减少 new space 尺寸
修改 `--max-semi-space-size` 增大 new space 尺寸
- 设置为 64 时，Scavenge GC 大概花费 10-20ms
- 设置为 128 时，花费在30-40ms，频率比 64 时减少一半。
    - Mark-sweep GC 少了一点，但引发 Eventloop lag（极端）耗时增大。

#### 降低 GC 频率
修改 `--gc-interval=1000`
增大了极端 Eventloop lag

## 小技巧
通过 `kill -USR1 node-process-pid` 开启 node 进程 debug 模式，然后使用 Chrome DevTool `chrome://inspect`页面连接到 node 进程，即可直接进行 profile

