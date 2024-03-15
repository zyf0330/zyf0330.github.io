---
layout: post
title: 'IDE 查看调用层次 Call Hierarchy 功能.md'
date: 2023-08-16
category: 研发效率
---

我们在做代码重构或底层功能修改时，绕不开的一件事，是对底层功能改动进行调用链检查，来确保没有影响到不该影响的上层功能。因此，IDE 能快速高效地检查调用链在这种时候是非常有帮助的。
这里用举例的方式，来介绍一下 IDEA WebStorm 开箱即用的 Call Hierarchy 功能，可以用来展示一个函数或变量的调用链。


将指针焦点放到函数上，按 Double-Shift，输入 call hierarchy，回车即可打开 Call Hierarchy 视图。
﻿
![](../attachments/Pasted%20image%2020240315124526.png)

﻿从列表中，可以容易地看到哪些 Facade API 和 Service 使用了这个方法，来确定改动的影响范围。
﻿
![](../attachments/Pasted%20image%2020240315124535.png)


﻿除了能查看调用者 caller 的层次，还能查看被调用者 callee 的层次。点击工具栏中的第二个按钮即可切换。
﻿
![](../attachments/Pasted%20image%2020240315124543.png)


看起来是不是很清晰。
然而，从举例的这个方法来看，它的调用链太长了，调用深度太深了，调用范围也太广了。这种情况下，检查调用链本身就变得很困难。
我们应该能想象到到，这样的一块逻辑若是发生了变动，影响范围会有多大。那么如果这个模块不够封闭，它的改动总是会传导出去，就会造成实质性的影响。


VS Code 应该也是支持这个功能的，右键菜单中有 Show Call hierarchy。

