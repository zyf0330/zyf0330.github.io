#!/bin/sh

set -e

OBSIDIAN_ROOT=$HOME/data/OneDrive/Documents/obsidian/我的
TARGET="$PWD/_posts"

mkdir -p $TARGET

\ls "$OBSIDIAN_ROOT" | while read category; do
  category_path="$OBSIDIAN_ROOT/$category"
  file "$category_path" | grep directory >/dev/null || continue

  if [ "$category" = attachments ]; then
    cp -r "$category_path" $TARGET
  else
    \rm -rf "$TARGET/$category"
    mkdir -p "$TARGET/$category"
    \ls "$category_path" | while read post; do
      birthtime=$(date --date=@$(($(stat "$category_path/$post" --format %W))) +%Y-%m-%d)
      echo "$category - $post - $birthtime"
      echo "---
layout: post
title: '$post'
date: $birthtime
category: $category
---

$(\cat "$category_path/$post")
" >"$TARGET/$category/$birthtime-$post"

    done
  fi
done
