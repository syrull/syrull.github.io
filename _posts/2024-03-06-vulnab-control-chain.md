---
title: "Vulnlab - Control Chain [Hard]"
category: ctf-writeup
layout: post
---

> This is an experimental write-up that I did with AI, I trying to proof-read them as well as I can, but apologies if there are misstakes.

In this challenge, we are presented with two target machines, each offering a different attack surface. The journey begins with a reconnaissance phase, identifying open ports and services through scanning.

### Initial Scanning and Discovery

For the **intra** machine, the open ports discovered were:

- `22/tcp` for SSH
- `443/tcp` for HTTPS

On the **os** machine, the ports identified were:

- `22/tcp` for SSH
- `80/tcp` for HTTP
- `443/tcp` for HTTPS
- `8443/tcp` 
- `8444/tcp` 

### Gaining Initial Access

Exploring the **os** machine's HTTPS service on port `443` led us to a wiki page hinting at the use of `pydio` and `osctrl` services. Within this page, we found some valuable information, including a potential default password `Sum<redacted>` and a list of user accounts:

- Jimmy George - `j.george`
- Ann Rodriguez - `a.rodriguez`
- Adriana Larose - `a.larose`
- Kara Leblanc - `k.leblanc`
- Steven Thibodeau - `s.thibodeau`
- Kurt Dagenais - `k.dagenais`
- Ken Pare - `k.pare`
- Yvon McBride - `y.mcbride`

We extracted those users, from the `revisions` of each page.

Utilizing the discovered password, we were able to authenticate as users `y.mcbride` and `k.dagenais` in the `pydio`.

### CVE 2023-32749

Leveraging CVE 2023-32749, detailed at [Exploit Database](https://www.exploit-db.com/exploits/51496), we escalated privileges by assigning an admin role to a newly created user. This vulnerability allows attackers to modify user roles, thus granting unauthorized access to sensitive cells within the application. 

### Extracting Sensitive Information

Within the administrative area, we intercepted a conversation mentioning the creation of a `provision` user with the password `TeiG6im<redacted>` for testing purposes on the `os.control.vl` server. This information provided SSH access as the `provision` user, from which we extracted the `.ssh` folder for future use.

#### Pyio's Chat

```
@Kara: I added this room to share scripts, outputs, documents for our osquery project and already added some documents.

Also, as discussed I created the provision user on `os.control.vl` with password `TeiG6imee<redacted>` so we can start using your temporary provisioning solution on the first servers for testing.
```

### Database Access and Further Privilege Escalation

On the same machine, a PostgreSQL database was found listening on port `5432`. Accessing the database using the default `postgres` user revealed the `osctrl` database. Within this database, we targeted the `admin_users` table to replace the bcrypt password hash of the admin user with a known hash for the password `admin`, facilitating web system login.

```sql
UPDATE admin_users    
SET pass_hash = '$2a$10$3.g.9xQtpwNpOxYsEXZX...xxMJcttMqcCw5i3imHBGJ6VJfFw41W'
WHERE id = 1;
```

### Final Stages of System Compromise

The `osctrl` system can be used to run arbitrary `osquery` queries towards the enrolled nodes, with the following query we can list files in a given directory, this is going to be useful for enumerating files in the machine.

```sql
SELECT * FROM file WHERE path = '/given/path';
```

The `osctrl` system allowed file extraction from enrolled nodes this feature is called "craving file". Exploiting this feature, we extracted the `.ssh` folder of the user `kara`, which contained SSH keys. These keys provided access to the `kara` account, which had `sudo` privileges, allowing us to switch to the `root` user.

### Infiltrating the Intra Machine

Investigation on the **intra** machine revealed that the `root` user's `authorized_keys` contained the `provision` user's private key. 

The `authorized_key` however can be run with only a few commands, stated in the command script in the `authorized_keys`.

```bash
#!/usr/bin/bash

# (c) 2022-2023 by Kara Leblanc
#
# This is a temporary server provision wrapper for control.vl unix servers.
#
# For security reasons the provisioning ssh key is only allowed to run 
# this script and not all commands on the machine. 
# This script will only allow to run commands that are contained in special
# modules in the modules/ directory. Despite being highly secure there are
# probably better solutions to our problem but we need to evaluate them. We
# will therefore stick with this script for now.

set -- $SSH_ORIGINAL_COMMAND
if [[ -n $1 ]] ; then
  module=$(basename ${1})
  shift
  if [[ -f /opt/provision/modules/$module && -x /opt/provision/modules/$module ]] ; then
    exec "/opt/provision/modules/$module" "$@"
  fi
fi
```

The executable commands are:
- `prov_osqd`
- `prov_df`
- `prov_uname`

Among the executable commands, `prov_osqd` stood out. This script, intended for enrolling systems, could be abused to execute a reverse shell by intercepting the `curl` request for `enroll.sh` and replacing it with a malicious script.

#### `prov_osqd` script

```bash
#!/usr/bin/bash
if [[ -z $1 || -z $2 ]] ; then
  echo "Missing options." >&2
  exit 42
curl -sk https://os.control.vl/${1}/${2}/enroll.sh | bash
```

### Exploitation Summary

To exploit `prov_osqd`, the following steps were executed:

1. Stopped the `nginx` service on the **os** machine.
2. Modified the `nginx` configuration to proxy traffic to a local Python server on port `8000`.
3. Created nested folders on the Python server to mimic the expected path and placed a malicious `enroll.sh` script containing a reverse shell.
4. Triggered `prov_osqd` with arbitrary arguments, resulting in the execution of the reverse shell script.

This comprehensive approach allowed us to gain root privileges on the **intra** system.