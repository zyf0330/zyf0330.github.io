---
layout: post
title: '如何让 Git 同时有两个暂存区 —— git worktree.md'
date: 2023-04-11
category: 技术文章
---

# 背景

如何让 Git 同时有两个暂存区，是很多人在使用 Git 过程中想要问的。产生这个问题的场景，一般有如下几种：

- 我现在正在改代码，但是我同时需要 review 别人的代码
- 我现在正在改代码，但是我需要紧急修复另一个 bug
- 我要同时开发两个分支
- 等等


由于我们正在修改的代码，已经占据了当前的暂存区 stage area，当遇到上面的场景，我们需要清空暂存区，然后检出 checkout 到别的分支来做对应的事情。

往常我们的做法：

1. 要么是使用 stash
    1.   `git stash`  
    1.   `git checkout other-branch`  
    1.   `do someting`  
    1.   `git switch -`  
    1.   `git stash pop`  
1. 要么是使用 commit
    1.   `git commit -a`  
    1.   `git checkout other-branch`  
    1.   `do someting`  
    1.   `git switch -`  
    1.   `git reset HEAD^ --mixed`  
1. 重新在另一个路径 clone 一份项目


前两种方法各有各的缺点，共有的缺点就是，你总是  **必须得做一些事情来清空暂存区。**  而第三种方法，太重了也太不便了，另外这使你无法使用同一个 Git 来管理同一个项目。  

还好， Git 引入了一个新的命令来解决这些场景的问题，就是 git worktree

# 介绍 git worktree

首先简单介绍一下 worktree 的概念。

一个 Git 管理的项目，根目录会有 .git 目录。对目录下的文件进行修改，会被 Git 追踪。  **work tree 就是对这个目录下的文件的修改的追踪**  。

这里要注意一点，一个 worktree 对应的是一个磁盘文件的目录。

> 当我们使用 git status 的时候，经常能看到   `nothing to commit, working tree clean`  这句提示，这意味着没有文件被改动，working tree 是干净的。

而 git worktree 就是用来创建和管理工作树的。可以创建超过一个工作树，就意味着你可以同时在多个工作树里进行不同的改动，互不干扰。

### git worktree 子命令

这里简单介绍几个最常用的命令，更多详细用法参考   `git worktree --help`  

-   `git worktree add`  创建工作树。在指定的磁盘路径创建一个工作树，并且检出到指定的分支
    - 指定的目录会复制一份项目文件，但 .git 变成了一个文件，记录了它所属的主工作树
    - 该分支会在 git branch 中列出来，以单独的标记，我这里是 +
-   `git worktree list`  列出当前所有的工作树
-   `git worktree remove`  移除工作树


### 实战

现在对于开头提出的问题，我们就可以这么做

1. 你已经做了一些改动，现在要同时做另一件事 hotfix
1.   `git worktree add ../hotfix`  
1. 使用你喜欢的编辑器打开 ../hotfix 目录，做相关工作。同时你当前的主工作树不受到任何影响
1. hotfix 工作树的工作做完后，使用   `git worktree remove path-to-hotfix`   移除这个工作树


# 总结思考

git worktree 这个命令其实也出来好几年了，但是我最近才了解到。在知道它的效果后，毫不犹豫的抛弃了以往的做法，因为它完美的解决了痛点并且没有引入新的麻烦。



让我最感叹的，是这个设计是如此的精妙。它带来的改动丝毫没有破坏原有的 Git 体系，并且相容的很好。

回顾总结一下这个设计，Git 原先有一个 worktree，用它来追踪未提交的文件改动，并且在里面做一切 Git 相关的事情。某天人们希望对同一个项目在两个本地空间各做各的改动，那么就让原来的一个 worktree 变成并列的多个，既不改变 worktree 本身的功能，也不改变任何在 worktree 上能做的事情。

> 具体的设计思路和细节可以查看   `git worktree --help`  的 DETAILS 节



对于 Git 这样一个成熟的软件来说，增加新功能时保持兼容性是一件非常重要的事。要在保持原有功能照旧工作的基础上加入新的功能，可以想象成拼积木，原有的功能要像积木块一样容易拼插，新的功能才能很好的合进去，不论是放到其内、其间、或是其外。

