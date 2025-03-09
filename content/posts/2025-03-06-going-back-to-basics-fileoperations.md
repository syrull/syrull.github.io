---
title: "Going Back To Basics - File Operations"
date: "2025-03-06"
tags:
  - C
  - asm
toc: true
bold: true
nomenu: false
draft: true
---

## File Operations

I've become so used to interpreter languages such as Python (my favorite) that I am kinda forgetting or frankly not knowing how are some operations running underneath. One example is common file operations, I know how to read/create/open/delete files with Python, but I am pretty aware that a simple call of `open` is abstracting a lot. For example let's explore the `open` function's documentation.

```python
open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)
```

> The approach that I will be going for is top -> down, the idea is that I would start from the python's open function and finish it with what system calls are being used.

The current signature for open that I am reading is for Python 3.13.2. Starting with the `file` argument, obviously this argument would be a string that contains the path to the file, but what happens after that? According to the Python's documentation the file argument can be not only a string, they refer it as object (or interface) for a file-oriented API (with methods like read, write). I will ignore what types of objects can be inserted there since it goes out of the scope of the post, let's instead see what happens when the file object/string is resolved, and we would like to read it.

# Read Operation

A read operation can be simplified with just the filename as a string to the open function.

```python
file = open("filename.txt")
```

This would return a `_io.TextIOWrapper` object, the `_io` module is C code that the `io` module uses internally, this is a well known pattern within python's source code (eg. `_csv, csv`). The `open` function comes with a lot of defaults that does the heavy lifting such as the file is opened in "r" mode, which mean for reading, you may also see a "t" thrown here and there which means "text", so essentially "rt => readtext" which is the default. The wrapper class is decided based on the mode.

Another example would be if we try to "rb" or read in binary mode then we would get `_io.BufferedReader` class, now comes the questions how many types of classes do we have like that, and why do we need them?

Well, the first answer to the question is:

1. `TextIOWrapper` - [textio.c](https://github.com/python/cpython/blob/main/Modules/_io/textio.c)
2. `BufferedReader` - [bufferedio.c](https://github.com/python/cpython/blob/main/Modules/_io/bufferedio.c)
3. `BufferedWriter` - [bufferedio.c](https://github.com/python/cpython/blob/main/Modules/_io/bufferedio.c)

Now, onto why there are several classes, the difference is how the data is being interpreted, and what mode is being used. In the case of `TextIOWrapper` the data is going to be interpreted as "text" and encoded with "utf-8" by default, if we call the `read()` method, we would make a call towards the `_io.TextIOWrapper.read()`, which when the MRO (Method Resolution Order) is followed will result in `_TextIOBase.read()`.

Now we are in C's territory, since that `_io` is entirely written in C we can just take a look at the [source code - `textiowrapper_read_chunk`](https://github.com/python/cpython/blob/main/Modules/_io/textio.c).

