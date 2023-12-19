---
title: "Hack The Box - Sandworm [Medium]"
category: ctf-writeup
layout: post
---


I began with a simple scan, to check the ports of the machine.

```bash
$ rustscan -a 
Open 10.10.11.218:22
Open 10.10.11.218:80
Open 10.10.11.218:443
```

I went to the website that is being hosted on port 80, and I saw that there is some sort of PGP stuff. Furthermore, I noticed the following URLs:

```http
https://ssa.htb/login
https://ssa.htb/
https://ssa.htb/pgp # the site's public key
https://ssa.htb/guide # some sort of playground for PGP
https://ssa.htb/contact
https://ssa.htb/guide/verify
https://ssa.htb/about
https://ssa.htb/login?next=%2Fadmin
https://ssa.htb/guide/encrypt
```

In the `/guide` endpoint there is some sort of playground for PGP, and while I was playing with it, I have noticed that when I am using the verify signature there is output that looked like pulled from the console. 

I've enumerated the technologies and versions that the website is using, I found that it used Flask as the main server application and (possibly Flask for the frontend/templating engine). 

## RCE 

When I saw Flask I thought that the application could be using Jinja, so I immediately thought that this could be a potential [SSTI](https://book.hacktricks.xyz/pentesting-web/ssti-server-side-template-injection). 
I had only a single entry point that could give me output which was through `Verify Signature` in the `/guide` endpoint. 

### Crafting the exploit

The injection point is the `name` of the PGP key, so I've generated a key called `syl`.

```bash
$ gpg --gen-key
```

The exploit is described/explained [here](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection#jinja2).

After that, we need to export the public key using this command:

```bash
$ gpg -a -o public_key.key --export syl
```

then we should craft an arbitrary message:

```bash
$ echo 'test' | gpg --clear-sign
```

--- 
### Common Issues

While crafting this, I've experienced serious hassles such as:
- wrongfully crafting the message
- using different key to encrypt the message

I fixed those issues when I started clean and using only 1 key, and whenever asked for anything "passphrase/name" I just typed "syl".

To check the current keys that you have:

```
$ gpg --list-keys
```

Another useful website is this one: https://www.sobyte.net/post/2021-12/modify-gpg-uid-name/ I've used the article to modify the name of the key, and then to export the public key again.

---

Upon crafting the message, paste the message and the public key and click to verify the signature, this would get you a reverse shell to the machine.

## Atlas (`firejailed`)

The user that we got `atlas` is actually is `firejailed`, commands such as `wget/curl` are not available in the environment. The pivot point is in the `httpie` directory in the `$HOME` folder. There you can find the `admin.json` file where the SSH credentials for the user `silentobserver` are. 

## `silentobserver`

I ran `linpeas.sh` to check where would my next pivoting point would be, I stumbled fairly fast on these files that I could write:

```
/opt/crates/logger/src
/opt/crates/logger/src/lib.rs
```

I noticed the application located in the `/opt` directory `/opt/tipnet/` I've examined the source code, and it is some sort of `rust` application, I already got a hint to those writable directories and whenever I saw the source code:

```rust
extern crate logger;
...
logger::log(username, keywords.as_str().trim(), justification.as_str()); // Invoking it later on.
```

I knew that I could modify the crate that could be executed by the application.

But what is this application? And where is it running?

## `Tipnet` Application

This application is running like that: 

```
/bin/sh -c cd /opt/tipnet && bin/echo "e" | /bin/sudo -u atlas /usr/bin/cargo run --offline sleep 10
```

We can see the user `atlas(not firejailed)` is running it, so this could be our next attack vector.

I've crafted a rust reverse shell: https://doc.rust-lang.org/std/process/struct.Command.html and added it into the `logger/src/lib.rs` file then I build the crate using `cargo build`.

After some seconds, your listener should be getting a connection from the server, that would be the `atlas` user.

# `Atlas` user to `root`

Fairly simple and straightforward, this is a [CVE-2022-31214](https://github.com/advisories/GHSA-m2xv-wgqg-4gxh "CVE-2022-31214") vulnerability. You can use the already crafted exploits for that:

- https://www.openwall.com/lists/oss-security/2022/06/08/10 

There are issues with that exploit, I believe it is in the `wait` mechanism. To make sure that it is working correctly add a `breakpoint()` in the beginning of the script then you can follow the execution by pressing "n".

![rwojak](/htb/htb-sandworm-firejail.png)
