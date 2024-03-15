---
layout: post
title: 'ng serve --host 在 Windows 上出现的一次“异常”.md'
date: 2023-04-11
category: 技术文章
---

## 背景

昨天   @zhaidong   的 Windows 电脑上出了个问题，  `pingcode.local`  无法成功访问本地启动的前端服务。

这个问题搞了大半天，中间怀疑过是 DNS 服务的问题、Windows 的系统配置问题，但始终没有解决。

最后是  @wangwenliang   的一个尝试——显式设置   `ng serve --host 0.0.0.0`  ，让我发现了问题的真正原因。



## 问题详解

> 忽略前面无意义的排查过程

  `ng serve`  的   `--host`  选项用来指定 Angular HTTP dev server 启动时绑定到的地址，默认是   `localhost`  。

表面上看它似乎是个域名，但是在技术上不是这样。

Host 是主机，形式上可以是域名或 ip，但对于背后的 http server 来说，它是需要将监听连接的 socket 端口绑定在一个   `ip:port`  上。因此   `--host`  指定的值如果是域名，会被解析为 ip.



一般情况下我们认为   `localhost`  对应的 ip 就是   `127.0.0.1`  了，同时前端也在 hosts 文件中手动将   `pingcode.local`  解析到了   `127.0.0.1`  ，这就是为什么在浏览器中  `pingcode.local`  域名能访问到本地的 dev server.

```
pingcode.local => 127.0.0.1 === 127.0.0.1 <= localhost <= dev server
```



然而在这个问题出现的场景中，访问不到了。

这是因为全新安装的 Windows 11 将   `localhost`  解析为   `::1`  ，这是 ipv6 版本的   `127.0.0.1`  。

注意：这是两个 ip 地址，背后是不同的路径。

```
pingcode.local => 127.0.0.1 !=! ::1 <= localhost <= dev server
```

> 在 Windows 的资源管理器-网络中，可以查看 http server 监听的 socket 地址。



而   `0.0.0.0`  代表的是任意 ipv4 地址，当然也包括   `127.0.0.1`  。



## 解决办法

那么是要让这台 Windows 11 解决自己的问提，按照 ipv4 解析 localhost 呢？

> 禁用相关网络适配器的 TCP/IPv6 协议

还是给   `ng serve`  指定   `--host 127.0.0.1`   呢？



一方面考虑到 ipv6 会越来越普及，修改操作系统的网络配置是逆势而为；另一方面，让  `pingcode.local`  的解析和 dev server 绑定 ip 同时指向   `127.0.0.1`  ，是前端开发的需要，应视为开发工具链的一体化配置的一部分。

因此我建议选择第二种办法。



## 结尾

鉴于其他两位当事人都没有太多精力写每日一学，就由我来总结一下。



好了，以上就是今天的每日一学。不知道大家学到了什么吗😉

