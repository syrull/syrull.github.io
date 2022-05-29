---
title: "From Python to Rust (Data Types)"
date: 2022-05-28T21:35:13+03:00
draft: false
---

The idea of this post (there could be multiple posts) is to learn Rust as I begin to look at the differences between Python and Rust. My plan is to start with the most simple things and proceed to the more advanced ones. I am gonna follow a simple roadmap:

```
- Variables
- Data Types
- Functions
- Array or Lists
- If statements
- Conditional loops
- Classes and objects
- Exception handling
- Trees, maps, and more.
```

In this post I am gonna start with the Data Types.

## Integers

### Python 

The integers in Python are immutable and their size is unlimited (until you reach the end of your memory) [source](https://docs.python.org/3.10/library/stdtypes.html#numeric-types-int-float-complex). You can declare them simply by `x = 5`. One interesting fact about the integers is that the numbers between `-5..256` are cached by the cpython vm since their usage frequency is really high.

```python
>>> x is y
True
>>> print(id(x), id(y))
2876372314544 2876372314544
>>> x = 257 
>>> y = 257 
>>> x is y  
False
>>> print(id(x), id(y))
2876378360176 2876378359824
>>> x = -6
>>> y = -6
>>> x is y
False
>>> x = -5 
>>> y = -5
>>> x is y
True
```

We can write integer literals with binary, octal and hexadecimal values. 

```python
>>> 0b11011101 # binary
221
>>> 0x515 # hexadecimal
1301
>>> 0o55 # octal
45
```

We can use delimiters with the `_`, eg: `x = 1_000_000` for better reading.

### Rust 

The integers in Rust are also immutable, and since that Rust is statically typed language, we need to declare the type of the integer that we are gonna use. In Rust the type of integers are:

[Full explanation in depth in the original rust documentation](https://doc.rust-lang.org/book/ch03-02-data-types.html)

| Length | Signed | Unsigned |
|--- |--- |--- |
| 8bit | `i8` | `u8` |
| 16bit | `i16` | `u16` |
| 32bit | `i32` | `u32` |
| 128bit | `i128` | `u128` |
| arch | `isize` | `usize` |

The MAX value for each integer is denoted by -(2^(n - 1)) to 2^(n - 1) - 1, the arch type is short for architecture and it represents the current architecture of the OS (eg. 64/32). 

As for rust optimizations of this sort are not needed due the speed of the language so if we check the address of an integer 
```rust

```

### Comparison


