---
layout: post
title: 'sinon stub 失效了？.md'
date: 2023-04-11
category: 技术文章
---



## 背景

在 typhon 重新删除 lock 并重新安装依赖后，发现使用 sinon stub 的测试代码失效了。

这警告我们，如果依赖出了问题，简单的删除 lock 重新安装是有很大风险的！



再介绍一遍，typhon 使用 Jest 作为测试框架，swc 作为 ts 代码编译工具。



## 定位原因

经过几乎一下午的问题排查，使用的手段主要是逐个排查出问题的提交，然后是出问题的包，再是出问题的版本，终于定位到了原因。



ESM 规范，静态导出模块的成员是只读的（getter + configurable: false），这导致   `sinon.stub`   不能生效。  `@swc/core`  在 v1.2.206 遵循了该规范。



并且，这个问题可能或已经影响到了 webpack 4、babel、tsc 等其他编译工具，以及 Jest 等其他测试 mock 手段。



相关线索，就不细讲了

- swc issue   [https://github.com/swc-project/swc/issues/5205](https://github.com/swc-project/swc/issues/5205)  
- swc 讨论和 work-around：  [https://github.com/swc-project/swc/discussions/5151](https://github.com/swc-project/swc/discussions/5151)  
- tsc issue   [https://github.com/microsoft/TypeScript/issues/39977](https://github.com/microsoft/TypeScript/issues/39977)  




## 如何解决

就目前看来，在迁移到 ESM 时，测试这块已经无法平滑迁移了。

因为 sinon 官方也不认为应该由它们来兼容这个变动，而是由开发者自己来使用针对   `getter`  的 stub 方法。至于 Jest，倒是干得不错，已经在开始以兼容方式本地支持 ESM 的 mock 手段，就是不知道什么时候才能稳定。

