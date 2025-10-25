---
title: "BlueHensCTF 2024 - Corkscrew"
pubDate: "2024-11-10"
description: "CTF challenge writeup."
tags:
  - writeups
  - ctf
  - cipher
toc: true
math: true
---

We start with  a few hints and a string that we should rearrange. The hints are that this consists of a old school crypto and the string is `Us_lnt10ns}1443{FTCDqsysp0srrr4up_t1`.

After consulting with my best friend chatgpt, it hinted me that this could be a Spiral-Like cipher. So it goes like this:

The text is 36 chars long and we can create a square shape out of it.

```
U  s  _  l  n  t
1  0  n  s  }  1
4  4  3  {  F  T
C  D  q  s  y  s
p  0  s  r  r  r
4  u  p  _  t  1
```

Then we simply transpose it clockwise in a spiral way so that becomes

```
U  s  _  l  n  t
D  q  s  y  s  1
C  u  p  _  p  0
T  4  q  t  0  n
F  r  r  1  s  s
{  3  4  4  1  }
```

And each column contains the flag:

```
UDCTF{squ4r3_sp1r4ly_tr4nsp0s1t10ns}
```