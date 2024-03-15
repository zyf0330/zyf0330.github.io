---
layout: post
title: '详解 chaos RPC 请求中的 ECONNRESET 错误.md'
date: 2023-04-11
category: 技术文章
---

## 起因

最近几个月，线上环境越来越频繁地报错，内容包括诸如   `ECONNRESET`,  `socket hang up` ,  `connection reset by peer` 。经过检查，这些都是   **rpc**   请求在  **客户端**  报的错，而且大多都是请求   **typhon**   RPC 服务时出现的。 ^ab9f7d

## 探索错误原因

接下来我们要开始探索这个错误出现的原因。
先了解一下   `ECONNRESET`   的含义，既然是 Node 语言就先看 Node 的文档。可以在   [https://nodejs.org/api/errors.html#common-system-errors](https://nodejs.org/api/errors.html#common-system-errors)   找到说明。

> 注意：这是一种系统错误，具体查看 errno(3)。如果对网络层和 TCP 协议有一些了解，就会知道这个错误大概是什么意思。  [中文拓展阅读](https://blog.csdn.net/maligebazi/article/details/80304894)  

现在我们知道了，当我们试图向一个已经关闭的 socket 发送数据，就会被给出这个错误。而 pingcode 服务的 rpc 服务框架是由 chaos 提供的，并且目前线上环境使用 HTTP 协议。结合这两点，就很容易想到一个最可能的原因：开启了 keep-alive 的 HTTP 请求创建了 TCP 长连接，后续的 HTTP 请求在其上发送，但某一时刻连接关闭了。

> 还有一些其他的可能性，比如正常的请求被直接打断，但是出现概率相比之下更低。

既然跟 keep-alive 相关，就直接检查一下 chaos 中客户端和服务端相关的代码逻辑和设置。
- 客户端使用   `request-promise`   也就相当于   `request`   ，跟 keep-alive 相关的就是使用了   `forever: true`   参数。而在目前的 Node 版本中，这会导致 request 使用设置了   `keepAlive: true`   的 http Agent 而非 ForeverAgent。
- 服务端使用了   `Koa`   框架内部使用 http 模块。Koa 没有什么特别的设置。而 http 模块中服务端相关的默认配置就是   [keepAliveTimeout](https://nodejs.org/api/http.html#serverkeepalivetimeout)   5s。
- 在检查 Node 文档的过程中，在 http 文档中搜索 ECONNRESET 就会发现   [reusedSocket](https://nodejs.org/api/http.html#requestreusedsocket)   属性节下，已经有一个详细的关于该错误的介绍和代码复现示例。（所以大家要仔细看官方文档哟！）

## 复现

有这些证据结合 TCP 相关知识，我们已经可以通过严密的逻辑链接，在思维殿堂中构建这个错误的发生场景了。

客户端通过 chaos rpc 发送了一个请求，由于 keep-alive 的 Agent，底层 TCP 连接被维持存活。5s 的空闲过去，服务端由于设置了   `keepAliveTimeout`  ，在此时关闭连接。而客户端恰好在此时发起了一个新的请求并使用之前的连接发送。在请求数据到达服务端 socket 时，被给出 TCP   `RST`   指令，因此客户端给出了   `ECONNRESET`   错误。这里网络延时起了重要作用。

> 要正确理解这些，还需要对 connection 和 socket、HTTP 七层和 TCP 四层、网络延时和 TCP 握手等的概念有所区分。  现实世界的网络情况是非常复杂的，因此为了能处理它们，相关的协议也很复杂。

实际的复现代码我贴在这里

```
'use strict'
const requestLib = require("request");
const http = require('http');

const interval = 100
// Server has a 5 seconds keep-alive timeout by default
const server = http
  .createServer((req, res) => {
    res.write('hello
');
    res.end();
  })
  .listen(3000);
console.log("server keepAliveTimeout", server.keepAliveTimeout = interval)

const agent = new http.Agent({ keepAlive: true })

function request() {
  return new Promise(( resolve,reject ) => {
    const request = http.get('http://localhost:3000', { agent }, (res) => {
      res.on('data', (data) => {
        console.log("response data", data)
        // Do nothing
        resolve()
      });
    });
   request.reusedSocket
    request.on("error", (error) => {
      debugger
      reject(error)
    })
  })
}

async function request2() {
  return new Promise((res, rej) => {
    const request = requestLib("http://localhost:3000", {
      method: "GET",
      // agent: agent,
      forever: true,
    }, (error, response) => {
      if (error) {
        debugger
        rej(error)
      } else {
        console.log("response data", response.body)
        res()
      }
    });
  })
}

async function batchRequest(isFirst) {
  const ps = []
  console.log(`============== use library: ${isFirst ? "http" : "request"} =============`)
  for (let i = 0; i < 1; i++) {
    ps.push(isFirst ? request() : request2())
  }
  await Promise.all(ps)
  await new Promise((res, rej) => {
    setTimeout(() => batchRequest(isFirst).then(res).catch(rej), interval);
  })
}

batchRequest(true)
  .catch(e => {
    console.error(e)
  })
  .then(
    () => batchRequest(false),
  )
  .catch(e => {
    console.error(e)
  }).finally(() => {
    server.close()
})

```

> 最初我始终无法使用 request 库来复现，然而这样结果是不可取的。因为 chaos 使用的是 request 如果无法复现逻辑就不严密。在检查 request 生成的请求对象时，我发现它支持自动解析代理环境变量来设置代理。因此我想在这里是代理做了一些魔法，鉴于已经找到了问题的原因，就不继续探索了。

## 解决

既然找到了问题原因，那么最后一步就是解决掉它。

当你也经过和我一样的排查路径，或许在乍一想后，也会觉得在客户端捕获并处理这个错误是最好的办法。事实上，这也是   [request 做的修复](https://github.com/request/request/pull/3215/files)  。然而我们再也等不到它的发布，因为它已经 deprecated 了😥。另外，考虑到不论是 chaos 自己来实现这段逻辑或者改用别的库重写 http transport 也是稍微有点费事，我试着站在更高层（更底层）来考虑，这里是否真的需要 keep-alive，以及 chaos 是否真的意图用 keep-alive。

众所周知，HTTP 是面向 web 的，它的特性和默认配置不能很好的服务于 RPC 这种服务器间的内部网络调用。HTTP 的请求和响应必须保持顺序的特性，会导致并发请求时延迟后续请求的响应，而如果使用   `Connection: close`   就不会有这个问题，代价是会多一些开销来创建连接，提高总延时和内存占用但降低请求的平均延时。

但翻看了 chaos 的提交历史 fa7eb198c51833cd5aae57a96ca107e50a0af293 后，认为 chaos 意图是要开启 keep alive 的，因此就延续这个做法，因为可能有别的考虑，毕竟现在延时和性能也不是什么问题。

既然还是保持开启 keep-alive，那么最合适的做法就是  **将服务端的 keepAliveTimeout 设置为无限**  。至于客户端做类似 request 的修复是不应该的，由于 POST 请求非幂等，就不该在非业务层做统一重试，得根据业务来决定。

## 回顾

这里本来有个回顾，但是在写好之后，Testhub 出现了一个类似的问题。所以继续写😂

## 另一个问题

在上面的事件出现没多久后，Testhub api 服务器中也出现了一个错误信息报   `socket hang up`   的情况。具体情况是，testhub-api 在一个 api 请求中，先向 typhon rpc 服务请求成功，再处理一些业务逻辑，然后第二次向 typhon rpc 请求报错。

由于有了上面的排查经历，已经了解了   `ECONNRESET`   相关的知识，我基本可以下定论底层原因是一样的。查看过错误栈以后，发现错误也的确从 rpc 请求处抛出来的。但是秉着  **好奇心和对业务量增大产生性能压力的提前优化**  ，我们决定继续追查背后的原因。

当时了解到有这么几点现象：

1. 这个错误在某个固定场景下必现 
1. 在 K8S 中才会出现，本地测试不会出现
1. api 的请求耗时从开始到报错是 8s 多
1. typhon rpc 服务在将 keepAliveTimeout 设置为无限后，该错误就消失了


鉴于第一点和第三点，我认为这个问题的原因不同于上面那个问题的原因，因为每次都卡在5s时向被关闭的连接发请求是不太可能的，况且这个请求是8s多，而不是5s。

首先，我们先在 live 环境使用  **抓包**  方式，抓到 rpc 服务端和 testhub 的 rpc 客户端两侧的 TCP 包。正常的业务场景， 第一个请求建立 rpc 连接，在5s timeout 过后，rpc server 发送给 rpc client FIN 包关闭连接（socket shutdown），客户端也会回复 FIN 包，连接最终关闭。但是在这个问题场景里，rpc client 在收到 FIN 包后，没有回复 FIN 包来关闭连接，接着当第二个 rpc 请求发起并发送到 server 后，server 会回复 RST，client 会报错   `ECONNRESET`   和   `socket hang up`   。抓包发现也印证了业务报错。[[testhub-tcpdump.txt | tcpdump 抓包]]

那么问题就变成了，  **为什么 rpc client 没有回复 FIN 包来关闭连接呢**  ？起初我猜测，是 client http 开启了   `allowHalfOpen`   ，它会导致在客户端侧连接不可读但可写。但是结合正常的业务代码调试，摒弃了这个猜测，由于正常场景连接是会关闭的，并且在代码中也没有找到相关配置。

考虑到这个问题目前只能在 K8S 中复现，我一边回顾对 K8S 网络的知识一边在网上寻找相关问题和讨论。的确找到了一个比较相关的   [K8S issue](https://github.com/kubernetes/kubernetes/pull/18524)  ，但是检查过后发现，这个修复的是 K8S network proxy 对半开连接没有合适的关闭机制导致积攒了大量半开状态的连接。而在 node issues 中查找，也没发现特别一致的问题，但是从某个解决 net 问题的评论中，我意识到可以打开 debug 日志看看会不会有什么发现。

接下来，使用   `NODE_DEBUG=http,net`   环境变量启动 testhub-api 来打印 rpc client 的底层模块日志，分别比较正常和问题场景的日志，同时检查   **node v14 源代码中 lib/net.js**   中的 debug 日志出处，发现问题场景中的 end 调用时 socket 的状态是 pending 也就是在建立新连接中   `_final: not yet connected`     。这说明 socket end 的处理延迟到了第二个 rpc 请求发起时（也没有别的可能去建立新连接了），而正常场景则是   `_final: not ended, call shutdown()`   。

> 详细日志，可查找关键字   **HERE**

[normal-debug-net](normal-debug-net.log)
[[socket-hangup-debug-net.log]]

等等！socket end 的处理被延迟了？再等等！net.js 是 js，是  **JavaScript**   ，这说明 net 模块的代码也是在 node 的单线程中被执行的。当 end 被延迟处理，那不就意味着有同步代码阻塞住了嘛！找到第二个 rpc 请求之前最近的一段同步代码，加上耗时检查，发现这段代码在问题出现的特定场景下，执行耗时超过了5s，因此也就导致   `socket hang up`   必现。

具体就是这段代码，一段同步代码逻辑阻塞了整个 js 线程，整整8s左右。

![[b71aa2a3-79ed-4954-8678-4ce3917b11b4.png]]

尽管让 rpc server 关闭 keepAliveTimeout 也可以解决这个问题，但是那不是正确的解决之道，最好是优化这块的代码逻辑或者是产品体验。

## 真的回顾

如果说第一个问题比较偏底层，做业务的同学可能感受不到，那么第二个问题，就应该能让大家真正地体会到，在 js 里写阻塞时间长的同步代码，会出各种各样的、不知所云的问题。另外，耗时太长的 api 也会降低用户体验 。

所以谨记，如果业务逻辑有可能导致长时间阻塞，那么请不要让它阻塞线程。（写前端的同学们也是一样的噢）

