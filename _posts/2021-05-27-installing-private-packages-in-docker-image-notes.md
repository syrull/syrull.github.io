---
title: "Installing Private Packages in Docker Image - Notes"
layout: post
category: post
---

Quick notes about how to forward an ssh agent and other tricks regarding the installation of python packages. 

## Using SSH Forwarding 

Exporting the `$SSH_AUTH_SOCK` environment variable in the image. 

```
$ docker run -rm -t -i -v $(dirname $SSH_AUTH_SOCK) -e SSH_AUTH_SOCK=$SSH_AUTH_SOCK ubuntu /bin/bash
```

Or in the `environment` section of a compose file.

```
environment:
  SSH_AUTH_SOCK: $SSH_AUTH_SOCK
```

### Eventual Issues with that

- Installing ssh in the container
- Adding entries to `/etc/ssh/ssh_known_hosts`


### Caveats

- Traces of ssh keys inside the image

## References 
- https://gist.github.com/d11wtq/8699521 
- https://vsupalov.com/build-docker-image-clone-private-repo-ssh-key/ 
- https://medium.com/@bmihelac/examples-for-building-docker-images-with-private-python-packages-6314440e257c