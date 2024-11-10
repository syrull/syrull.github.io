---
title: "4T$ CTF 2024 - My Sky Blog"
date: "2024-11-11"
tags:
  - writeups
  - ctf
  - Go
  - ssti 
toc: true
math: true
bold: true
nomenu: false
---

We start with a simple blog website. We can create an account and login, upon logging in we are greeted with a random greeting and we have couple of options:

- Create a post
- Change Username/Password

After few black-box testing here for XSS, I've found XSS on the `/profile` because the username wasn't escaped, but that's not the main vulnerability. I've downloaded the source code and I saw that its a Go project and the name of the module is `module ssti` which hints for SSTI (Server Side Template Injection). 

The vulnerability is within the template `profile.html`

```html
<input
	type="text"
	class="form-control"
	id="username"
	name="username"
	value="{{.User.Username}}"
/>
```

Which contains the set of the current user's username. Now we can simply specify `{{ .User.Password }}` and we would get the hashed password for our user.

However, we need to become an `admin` so that we can access the `/flag` route. And the thing that the profile is rendering is the Session object which looks like this:

```go
type Session struct {
	// Private fields
	users []*User
	id    string

	// Public fields
	User    *User
	Posts   []*Post
	NbPosts int

	HasError bool
	Error    string

	CoolSentence string
}
```

Now we cannot simply grab the session id and replace it because those are not exported/public (lowercase letters). And we also cannot set ourselves to become admin because the option within `User.isAdmin` is also not exported. However when we check the `Post` model we would see the `Author` which is exported, and we also have an empty session from the admin containing 1 post which we can see in `sessions.go`:

```go
func CreateEmptySession() *Session {
	admin := &User{
		isAdmin:  true,
		Username: "admin",
	}

	// Get a random password
	randomPassword := uuid.New().String()

	admin.ChangePassword(randomPassword)

	id := uuid.New().String()

	return &Session{
		users: []*User{
			admin,
		},
		id: id,

		User: nil,
		Posts: []*Post{
			{
				Author:    admin,
				Title:     "Welcome to my beautiful Sky Blog!",
				Body:      "I welcome you to my blog, where I'll post about my adventures in the sky !",
				UpdatedAt: time.Date(2024, 5, 1, 12, 54, 30, 20, time.UTC),
			},
		},
		NbPosts: 1,
	}
}
```

So that basically means that we can access the admin's user by using the Post model. The Post model is an array, so lets get the first element of the array and chain it with `Author`. In this way we would get the Admin's user. But we need to somehow get its password or better, change it.. 

We have an available function called `ChangePassword` which we can use with the `Author`, so lets chain all the things together. Go to the profile and change the username to:

```
{{ (index .Posts 0).Author.ChangePassword "123" }}
```

Refresh, logout and login with `admin:123` and grab the flag. 

```
4T${w417_H0w_d1D_Y0u_d0_7h12}
```
