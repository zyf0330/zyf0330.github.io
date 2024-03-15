---
layout: post
title: '如何检查 Node Heap Snapshot.md'
date: 2023-04-11
category: 技术文章
---

# 一些说明
1. 这里只提供使用 node command line flag 抓取的方式
2. 当抓取内存快照时，程序是阻塞住的
3. 经过实测，对于一个 200MB 内存的服务，使用发送信号方式抓取快照，node v14 花了3分钟，而 node v16 花了30秒
# 需要抓取的几种场景
## GC 失败，heap OOM
在内存泄漏且无剩余内存的情况下，node V8 无法成功分配年轻对象，同时 GC 也无法成功释放空余内存，程序就会崩溃。
输出的日志有这么几种
```
<--- Last few GCs --->

[243548:0x4fb1890]    19082 ms: Mark-sweep 5.4 (6.2) -> 4.6 (7.5) MB, 14.9 / 0.0 ms  (average mu = 0.995, current mu = 0.994) allocation failure scavenge might not succeed
[243548:0x4fb1890]    21158 ms: Mark-sweep 5.4 (6.5) -> 4.9 (7.7) MB, 8.3 / 0.0 ms  (average mu = 0.996, current mu = 0.996) task scavenge might not succeed
[243548:0x4fb1890]    23785 ms: Mark-sweep 5.9 (9.7) -> 5.3 (10.2) MB, 10.8 / 0.0 ms  (average mu = 0.996, current mu = 0.996) allocation failure scavenge might not succeed


<--- JS stacktrace --->

FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory
 1: 0xa38a30 node::Abort() [node]
 2: 0x96e0af node::FatalError(char const*, char const*) [node]
 3: 0xbb7ebe v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [node]
 4: 0xbb8237 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [node]
 5: 0xd74445  [node]
 6: 0xda4dde v8::internal::EvacuateNewSpaceVisitor::Visit(v8::internal::HeapObject, int) [node]
 7: 0xdb0e16 v8::internal::FullEvacuator::RawEvacuatePage(v8::internal::MemoryChunk*, long*) [node]
 8: 0xd9cfaf v8::internal::Evacuator::EvacuatePage(v8::internal::MemoryChunk*) [node]
 9: 0xd9d228 v8::internal::PageEvacuationTask::RunInParallel(v8::internal::ItemParallelJob::Task::Runner) [node]
10: 0xd8fb09 v8::internal::ItemParallelJob::Run() [node]
11: 0xdb2d70 void v8::internal::MarkCompactCollectorBase::CreateAndExecuteEvacuationTasks<v8::internal::FullEvacuator, v8::internal::MarkCompactCollector>(v8::internal::MarkCompactCollector*, v8::internal::ItemParallelJob*, v8::internal::MigrationObserver*, long) [node]
12: 0xdb360c v8::internal::MarkCompactCollector::EvacuatePagesInParallel() [node]
13: 0xdb37d5 v8::internal::MarkCompactCollector::Evacuate() [node]
14: 0xdc57d1 v8::internal::MarkCompactCollector::CollectGarbage() [node]
15: 0xd81a98 v8::internal::Heap::MarkCompact() [node]
16: 0xd83588 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags) [node]
17: 0xd869cc v8::internal::Heap::AllocateRawWithRetryOrFailSlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [node]
18: 0xd550ab v8::internal::Factory::NewFillerObject(int, bool, v8::internal::AllocationType, v8::internal::AllocationOrigin) [node]
19: 0x109d68f v8::internal::Runtime_AllocateInYoungGeneration(int, unsigned long*, v8::internal::Isolate*) [node]
20: 0x14467f9  [node]
```

```
<--- Last few GCs --->

[1373569:0x4a67890]    18457 ms: Mark-sweep (reduce) 4.7 (6.6) -> 4.7 (7.6) MB, 5.0 / 0.0 ms  (average mu = 0.989, current mu = 0.014) last resort GC in old space requested
[1373569:0x4a67890]    18461 ms: Mark-sweep (reduce) 4.7 (6.6) -> 4.7 (7.6) MB, 4.3 / 0.0 ms  (average mu = 0.981, current mu = 0.007) last resort GC in old space requested


<--- JS stacktrace --->

FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
 1: 0xa38a30 node::Abort() [node]
 2: 0x96e0af node::FatalError(char const*, char const*) [node]
 3: 0xbb7ebe v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [node]
 4: 0xbb8237 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [node]
 5: 0xd74445  [node]
 6: 0xd86a61 v8::internal::Heap::AllocateRawWithRetryOrFailSlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [node]
 7: 0xd4c19d v8::internal::Factory::AllocateRaw(int, v8::internal::AllocationType, v8::internal::AllocationAlignment) [node]
 8: 0xd483f9 v8::internal::FactoryBase<v8::internal::Factory>::AllocateRawArray(int, v8::internal::AllocationType) [node]
 9: 0xd484b4 v8::internal::FactoryBase<v8::internal::Factory>::NewFixedArrayWithFiller(v8::internal::Handle<v8::internal::Map>, int, v8::internal::Handle<v8::internal::Oddball>, v8::internal::AllocationType) [node]
10: 0xed695e  [node]
11: 0xed6aad  [node]
12: 0x1074ff3 v8::internal::Runtime_GrowArrayElements(int, unsigned long*, v8::internal::Isolate*) [node]
13: 0x14467f9  [node]
```
> 其中 `Mark-sweep` 后面跟的内存大小就是崩溃时的占用的内存大小。

这种情况下，可以使用 node v14.18.0 新加入的 `--heapsnapshot-near-heap-limit` flag 来自动生成 heapsnapshot。它的原理是 node 检测到内存如果即将到达 heap 限制，就会**自动**生成最多指定数量的内存快照。
另外，可以通过 `--diagnostic-dir` 指定输出 snapshot 文件的目录。
> 可以写一段不断占用内存的代码，配合 `--max-old-space-size` 限制最大老年空间（单位 MB）flag 来测试

## 到达容器内存限制被杀死
> 比如到达 docker 内存限制会被 docker 杀死，而不是 OOM

这种情况下，程序是被容器杀死的，通过 SIGTERM 或 SIGQUIT 等信号，所以是正常退出。
此时，可以使用 `--heap-prof` flag 启动程序，并捕获相应的 kill 事件调用 `process.exit()` 正常退出，即可生成快照。
注意：如果程序是直接被 kill 或者由于 OOM 而退出，这个 flag 是不会起作用的
> ctrl+c 退出是 `SIGINT`，kill 默认信号是 `SIGTERM`，另外有时也会通过 `SIGQUIT`来终结程序

## 手动触发生成快照
使用 `--heapsnapshot-signal` flag 来设置 node 程序在接收到指定 kill 信号时生成快照，可以配合一些外部监测手段来一起工作。

# 如何分析
>参考 https://developer.chrome.com/docs/devtools/memory-problems/ 处的各篇文章来学习 v8 内存相关的知识，以及如何定位和处理内存问题。

## 制造一个 snapshot
这是一个利用定时循环不断生成新对象程序产生的 heapsnapshot [memory-leak-demo](memory-leak-demo.heapsnapshot)
打开 Chrome `chrome://inspect/#devices` 的 Node DevTools，在 Memory 标签页加载这个文件。
这张图片是加载好的 snapshot，其中 9.7MB 是当时程序占用的内存。
![](loaded-heap-snapshot.png)

## 查看和分析 snapshot
> 参考 https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots/#view_snapshots 来了解查看界面各个部分的含义和功能。

先直接看 Summary。
这里是根据类型或构造器名称列出的各种对象实例的内存占用。
Constructor 列是各种对象的构造器，包括基本类型和内置对象等等，如果有用户定义的某种类型或对象被异常大量创建，按照 Size 排序的话，就能很容易地看出来。

上半区是各种类型的对象实例以及它持有的关联对象，而下半区 Retainers 要反过来，是持有它的各个对象实例。
> 注意 @ 后面跟的是实例的编号，内存空间内唯一，可以用来区分实例


再看看 Containment，这里是以 heap 堆的视角来看内存分布的，可以了解数据排布的方式，可以从 global 或 window 开始检查内存占用。


最后再看一眼 Statistics，对整个程序的各部分对象内存占用分布有个了解。


另外，如果加载了多个文件，还可以使用 Comparison 来比较它们之间各种对象的 diff，但只能显示构造器层级的 delta。

