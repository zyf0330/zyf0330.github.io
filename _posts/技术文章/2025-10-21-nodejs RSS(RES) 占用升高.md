---
layout: post
title: 'nodejs RSS(RES) 占用升高.md'
date: 2025-10-21
category: 技术文章
---

这段代码，不断增大的 Map
```
const m = new Map()
let i = 0
while(true) {
  m.set(i++, {})
  if(i % 1000000 === 0) {
    console.log(process.memoryUsage())
  }
}

```
会导致错误
```
RangeError: Map maximum size exceeded
    at Map.set (<anonymous>)
    at Object.<anonymous> (/home/zyf/1.js:8:3)
```
表现为 nodejs 进程的 RES 内存占用不断升高
同时由于同步过程，process.memoryUsage() 可能不会有异常反应

另外，如果 old space size 或者说 heap size 低于1.5GB 可能不会观察到该错误，而是先观察到 GC 失败导致的进程被 OOMKilled

排查内存增长问题时候，应该调大内存限制和 `--max-old-space-size` 来暴露相关错误

