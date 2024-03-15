---
layout: post
title: '转换 Root 分区到 btrfs 文件系统.md'
date: 2023-04-11
category: Ubuntu Linux
---

# 准备工作
在 Ubuntu 系统下工作

- 备份分区！！！
- 一个 Linux Live CD 可以引导执行 btrfs-convert和修复引导
# 转换
1. `fsck /dev/xxx` 检查分区
1. `btrfs-convert /dev/xxx` 执行转换
    1. 如果转换失败，可能是空间不够
    2. `btrfs-convert -r /dev/xx` 执行回滚
# 修复引导
使用 `here` 分区作为转换后的 btrfs 分区挂载点
1. `mount -t btrfs /dev/xxx here`
## fstab
1. `chroot here`
2. 修改 `/etc/fstab` 中对应分区行
```
UUID=xx   /               btrfs   defaults           0 1
UUID=xx   /media/xxx      btrfs   defaults           0 0
```

## initrd 和  grub
1. 挂载 boot 分区
    1. `mount /dev/xxx /here/boot`
    2. `mount /dev/xxx /here/efi`
2. 挂载其他分区
    1. `mount -t proc /proc /here/proc`
    2. `mount --rbind /dev /here/dev`
    3. `mount --make-rslave /here/dev`
    2. `mount --rbind /sys /here/sys`
    3. `mount --make-rslave /here/sys`
3. `chroot here /bin/bash`
4. 重装 grub 和内核引导镜像 initrd img
    1. `update-grub`
    2. 编辑 `/boot/efi/EFI/ubuntu/grub.cfg` 确认 `root` 正确 [grub search](https://www.gnu.org/software/grub/manual/grub/html_node/search.html)

