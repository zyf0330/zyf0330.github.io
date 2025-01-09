---
layout: post
title: '修复 Btrfs Root 分区.md'
date: 2024-12-26
category: Ubuntu Linux
---

## 背景
几年前把 root 和 data 分区转换为 Btrfs 文件系统。\
今天正在使用电脑，发现 root 分区突然被重新挂载为 readonly。

曾经有几次对 root 分区进行过文件系统 check，当时报了一些 warning 但是还能正常使用，也没有深究

## 过程

### check
#### btrfs check
通过使用 `btrfs check --force /dev/nvme0n1p6`命令，发现这次除了之前存在的 waning，在两个阶段出现了 error
- `checking extents`:  `ERROR: errohrs found in extent allocation tree or chunk allocation`
    - `ERROR: add_tree_backref failed (extent items tree block): File exists`
    - `ERROR: add_tree_backref failed (non-leaf block): File exists`
- `checking fs roots`:  `ERROR: errors found in fs roots
    - `root 5 inode 74268091 errors 2001, no inode item, link count wrong  unresolved ref dir 29093386 index 1429013 namelen 11 name Preferences filetype 1 errors 4, no inode ref`
    - `root 790 inode 74187590 errors 1000, some csum missing`

简单的了解到这是文件系统元数据错误，实际数据没有损坏。原因比较模糊，都归结为比特反转 bit flip


### fix
#### btrfs check repair
首先尝试 repair，看是否能直接修复

> 先重新引导到 boot 分区的 gparted-live 镜像，在这里解决问题。
> boot 分区是单独的 ext4 分区。

可惜失败了

#### memtest
引导到电脑自带的 memtest86+ 进行一遍测试，排除了内存损坏问题。

#### btrfs repair init-extent-tree
尝试使用 `btrfs check repair --init-extent-tree` 看是否会有效\
但是实际执行了几十分钟还没有结束。经过搜索，有实际执行过几个小时甚至超过2天的经历。\
在确认此时分区仍旧可以被读取后，直接中断了命令。

### backup & format
#### btrfs snapshot/send
此时已经放弃了修复分区，而是备份文件后重新制作全新的分区。

首先尝试 btrfs send 来备份\
尝试重新将分区挂载为 rw，可以短暂地写入，但是很快又会被重新挂载为 ro.\
于是只能备份之前的 snapshot，还好每周都会做一次 snapshot。\
通过 `btrfs send snapshot-path -f file` 来将 snapshot 备份为文件。

但是，可能是因为 btrfs 本身的元数据损坏，所以这个过程也失败了。

#### tar
直接使用 tar 来打包，保留用户和权限，将 snapshots 排除出去。\
中间遇到了空间不够的情况，只好开启了压缩。

检查好备份文件大小和内容正确，将分区格式化，并重新将备份写回新分区。

#### 收尾
- 将新分区的 label 还原
- chroot 进新分区 update-initramfs

## 效果

成功引导入系统，看到了熟悉的界面，一模一样，无损还原。

但是发现 `ping` 命令无法正常使用，原来 tar 不会保留 capability，即使使用 `--xattrs` 选项。\
经过测试，rsync 开启`--xattrs`后，`ping`成功地保留了 capability，当然必须使用 root 用户。

