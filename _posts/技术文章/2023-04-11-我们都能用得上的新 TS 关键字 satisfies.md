---
layout: post
title: '我们都能用得上的新 TS 关键字 satisfies.md'
date: 2023-04-11
category: 技术文章
---

## 介绍 satisfies 关键字

TS 4.9 引入了一个新的关键字   [satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) ，这个关键字对我们的日常开发来说很有用，所以特别拿出来说一说。

从字面看，  **satisfies**  这个词的意思是  **满足**  ，这个词用得很准，因为它的作用就是确保前者的类型满足后者类型。

比如在  `a satisfies TypeA`  中，就是要求   `a`   的类型满足   `TypeA`  的类型。

## 对比   `satisfies`   和   `as`  

看了它的介绍，我们很容易联想到   `as`  （作为）。  `as`  的作用是将前者的类型  **转换**  为后者类型。

比如  `a as TypeA`  ，是将   `a`  转换为   `TypeA`  类型。

这俩看似差不多，但其实大大不同。它们的一个最重要区别在于：

> 基于奥卡姆剃刀原则，从它们的主要作用推断其隐含效果

-   `satisfies`   是用来检查类型的，它**不会改变**类型。就像是断言
-   `as`  能转换类型，所以会**改变类型**


从这个区别我们就知道什么时候该用哪个，在实际开发中，很多时候我们只是希望检查类型，但却用了   `as`  。


##   `satisfies`  的使用场景举例

在我们的日常使用中，  `as`  用来强转类型有很多种使用场景。其中一些用   `as`  是会导致类型不安全的，现在有了   `satisfies`  代替，可以写出类型安全的代码。这些场景有：

1. 将窄类型转为宽类型，将父类转换为子类
    -  只用 `as` 无类型错误，但不符合预期：  `const o = { foo: 1 } as Entity`  。由于   `Entity`  的 `_id` 是可选的，严格来说这样的类型本身就是不严谨的。
    - 先用 `satisfies` 检查出类型错误，符合预期：  `const o = { foo: 1 } satisfies Entity as Entity`  

1. 使用   `as`  将无类型值声明为某种类型
    -   `as`  未检查出类型错误：  `const allowApps = ["agile", "what is this"] as (keyof typeof ApplicationType)[]`  
    -   `satisfies`  可以检查出类型错误：  `const allowApps = ["agile", "what is this"] satisfies (keyof typeof ApplicationType)[]`  

1. `as const`  转换为常量的同时施加类型约束，但会将具体类型扩大为一般类型。比如下面，既希望值的类型是   `ApplicationType[]`  又希望这个变量是常量
    - 类型被扩大为   `readonly ApplicationType[]`：`const allowApps: readonly ApplicationType[] = [ApplicationType.access] as const`
    - 正确类型是 `readonly [ApplicationType.access]`：`const allowApps = [ApplicationType.access] as const satisfies readonly ApplicationType[]`

1. 举一个具体场景的例子。写测试时，  `expect`  没有为预期结果做类型推断，所以经常会使用   `as`  来确定类型，这里可以改成   `satisfies`  


 > `satisfies`   和   `as`   连用时，要注意顺序，是从左往右作用的。一般来说都是   `satisfies`  在左。

更多的场景大家可以在日常开发中总结归纳，只要记录一个原则，是要检查还是要转换类型。


## 最后

  `satisfies`  引入了手动类型检查，弥补了自动类型检查的不足。很多用到   `as`  的或是其他场景，都可以用它来替换，得到更好的效果。实在是很强大的关键字。

> 这里有一篇其他人写的使用心得   [https://medium.com/@cefn/typescript-satisfies-6ba52e74cb2f](https://medium.com/@cefn/typescript-satisfies-6ba52e74cb2f)  ，介绍了两种一般的使用场景，可以学习。


不过，对于这个关键字我想吐槽的一点是，相比于 as 来说这个单词太长了！

## 补充

有人同时提到了  `const a: TypeA = ...` ，也就是冒号后跟类型这种语法，这里把三个放一起说明一下。
- 冒号跟类型：在值出现前指定其类型，先验约束
- `satisfies`：在值出现后断言其类型，后验约束
- `as`：在值出现后改变其类型

这三者是不能互相替代的。

