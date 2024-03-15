---
layout: post
title: '如何使用 Chrome 捕获和分析 Node 程序内存.md'
date: 2023-04-11
category: 技术文章
---

## 开头

今天介绍一下如何使用 Chrome/Chromium DevTools 捕获和分析 Node 程序内存



## 为什么可行

因为 Chrome 和 Node 都基于 V8 构建，实际上这里的调试功能是 V8 提供的。



## 跟着做吧

跟随下列步骤，开始吧！

### 启动 Chrome DevTools for Node

在 Chrome 地址栏中输入并跳转到   *chrome://inspect/#devices*   地址，点击   *Open dedicated DevTools for Node*

### 激活 Node 进程的 inspector

有多种方法：

- 最简单的，使用 node 命令的   `--inspect`   和   `--inspect-brk`  flag
- 使用   `SIGUSR1`  信号可以激活运行中进程的 inspector，使用   `--inspect-port`  指定端口
    - 对于会启动子进程的 Node 程序，可以借助   `NODE_OPTIONS`  来使用这种方法，方便地调试指定的子进程




当 Node 进程的 inspector 激活后，会打印一个 websocket 地址，这就意味着激活成功。调试信号通道就是通过这个 websocket 地址建立起来的。

### 将 Chrome DevTools 连接到 Node 进程

之前启动的 DevTools 的第一个标签页是 Connection，在这里将 node 进程的 inspector 地址和端口填上，就会自动连接过去。

![](../attachments/Pasted%20image%2020240315130231.png)

### 查看实时内存使用情况

跳转到 Memory 标签页，node 进程的 JS VM 会出现在   *JavaScript VM instance*   中，并显示 heap 使用情况。

### 捕获内存快照

DevTools 提供了三种捕获内存快照的类型：

- *Heap snapshot*   是将当前内存使用情况进行快照，得到一个状态
- *Allocation instrumentation on timeline*   是捕获从开始到停止一段时间的内存分配情况，是一个过程
- *Allocation sampling*   也是捕获一段时间的内存分配情况，但不是基于时间线，而是调用栈。并对结果进行采样，所以性能消耗较小


> 捕获内存快照可能会暂停线程，或者拖慢程序执行速度



#### Allocation sampling

下面是第三种类型获得的结果示例图

##### Chart 形式

可以看到随着程序各个函数执行，程序的内存变化情况。

并且能看到不同内存大小时，程序在执行什么函数。


![](../attachments/Pasted%20image%2020240315130242.png)




## 结尾

对于其他类型的捕获，大家可以自己动手尝试一下。



另外，不止是内存，Chrome DevTools 也可以调试 Node 程序、进行 CPU Profile 等，今天不着重介绍了

