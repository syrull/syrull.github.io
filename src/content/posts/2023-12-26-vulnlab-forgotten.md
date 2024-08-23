---
title: "Vulnlab - Forgotten [Easy]"
publishedAt: 2023-08-20
description: "Vulnlab Writeup"
isPublish: true
---

| Name          | OS             | Difficulty                             |
| ------------- | -------------- | -------------------------------------- |
| **Forgotten** | Linux | <span style="color:green;">Easy</span> |

## Summary 

We would find a website that we are going to fuzz and find an installation page for the **LimeSurvey** software. Then we would set up our local database to work with the installation of that software and run it on the server. We would then install a malicious plugin so that we can gain remote code execution on the machine. Then we would find credentials in the environment variables that we can use to gain access to the SSH. After that, we are going to abuse the mount points of the docker image to gain root on the host machine. 

## Initial Foothold

Upon scanning the machine, we would find a couple of ports open ports.

```
$ sudo nmap -sS -sU 10.10.105.241 --min-rate 10000 --open -p-
```

<img src="/images/Pasted image 20231226123653.png">

Going to the web page, we would find that it results to status code 403, so the next step that we are going to take is to fuzz it

```
$ ffuf -w $commontxt -u http://10.10.105.241/FUZZ
```

<img src="/images/Pasted image 20231226123711.png">

Then we would find an installation page for the software **LimeSurvey**.

<img src="/images/Pasted image 20231226092416.png">

We are going to try to install it, however to do that we need to install `mysql` server onto our local server and expose it to the machine so that the system can connect to us, otherwise we would get:

```
ERROR 1130 (HY000): Host '<MACHINE_IP>' is not allowed to connect to this MySQL server
```

In order to do that, we would need to set our **MySQL** server to accept connections from anywhere and create a user.

First, we need to edit our configuration

```
$ sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Change "bind-address" to "0.0.0.0"
```

Then we can connect using the `root` user and 

```sql
mysql> CREATE USER 'forgotten'@'%' IDENTIFIED BY 'forgotten';
mysql> GRANT ALL PRIVILEGES ON *.* TO 'forgotten'@'%' WITH GRANT OPTION;
mysql> FLUSH PRIVILEGES;
```

We would then be able to install the **LimeSurvey** and get into the admin panel.

<img src="/images/Pasted image 20231226095209.png">

We can now research of some ways to get remote code execution on the machine using this software, a quick google search would lead us to this exploit: [LimeSurvey RCE](https://github.com/Y1LD1R1M-1337/Limesurvey-RCE).

The exploit is leveraging the plugins feature of the software to install a malicious plugin which can connect to our listener.

We can setup such plugin by cloning the repository and replacing the needed variables in the file `php-rev.php` after that we also need to edit the `config.xml` and add the installed version of the **LimeSurvey** to the `<compatibility>` element, after that we would zip the files and upload them.

```
$ zip plg.zip ./php-rev.php ./config.xml 
```

We can then navigate to `/index.php/admin/pluginmanager?sa=upload` to upload our plugin. After we upload it and activate it, we can start a local listener with the given configuration earlier, and to execute our reverse shell we need to head to `/survey/upload/plugins/Y1LD1R1M/php-rev.php`

<img src="/images/Pasted image 20231226130614.png">

We can now run `linpeas` to enumerate further, and upon examining the output we would find this environment variable set in the beginning `LIMESURVEY_PASS=5W5<REDACTED>` we would also find that the current shell is running within a docker container.

After finding that password I immediately tried it to change the user to `root` in the current container which worked, and I also tried to SSH with the user `limesvc` which also worked! 

<img src="/images/Pasted image 20231226131121.png">

And judging by the system information, it seems that we are not in the docker container anymore, if we list the home directory we would find the `user.txt` flag.

## Privilege Escalation

We can use a tool called **[CDK - Zero Dependency Container Penetration Toolkit](https://github.com/cdk-team/CDK#cdk---zero-dependency-container-penetration-toolkit)**  to inspect our docker container which runs the **LimeSurvey** application.

<img src="/images/Pasted image 20231226141545.png">

In the **Mounts** section we can see the listed mounts, the `resolv.conf | hostname | hosts` are standard for every container but the `/opt/limesurvey` isn't so we can check that out.

We can see that the host has mounted the `/opt/limesurvey` directory in the `/dev/` folder on the container, We can go to `/dev/` to create a single file and check its permissions on the host system. Since that the docker container process is running as `root` we would have the same permissions from within the container. The file that has been created is having `root` permissions.

We can now try the same thing but with the `bash` executable, we would try the following thing on the container:

```
root@efaa6f5097ed:/var/www/html/survey# cp /bin/bash ./syl
root@efaa6f5097ed:/var/www/html/survey# chmod u+s ./syl
```

Now on the host machine we can invoke our binary `./syl` and we should be `root`.

```
limesvc@ip-xxx:/opt/limesurvey$ ./syl -p
syl-5.1# whoami
root
syl-5.1# cat /root/root.txt
VL{<REDACTED>}
```