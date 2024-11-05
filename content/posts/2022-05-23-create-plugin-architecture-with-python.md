---
title: "Create Plugin Architecture With Python"
date: "2022-05-23"
tags:
  - python
toc: true
math: true
bold: true
nomenu: false
---

There are some use-cases where a plugin architecture is needed, I call this "code" plugins but it is quite possible that there is already a word for that. The idea is to 'load' functions or classes that are dynamically created so that you can have the reference to the instances at runtime. I've created 2 solutions for that matter one that is using the `__subclasses__` dunder method and one using a decorator.

## Solution 1

Repository: https://github.com/syrull/plugin-arch-python/tree/main/Solution-1 

```
SOLUTION-1
│   configuration.py
│   main.py
│   README.md
│   setup.py
│
└───actions
        action_example1.py
        action_example2.py
        __init__.py
```

Loading the `__subclasses__` of the `BaseAction` class and creating a 'pluggable' classes. The actions can be specified in the `configuration.py` file in the `ACTIONS` const. This method is inspired by django's `INSTALLED_APPS` method. 

The `call` method is a placeholder for the "actions".

### To Register an action

- New python file in `actions/` folder
- Create a class with an appropriate name (ex. `ClickAction`)
- Extend the class with `BaseAction`
- Add an entry to `ACTIONS` const located in `configuration.py` file with the approriate path to the module

After that the function will be available at the `register` in the `main.py` file.

```python
$ python main.py
[<class 'actions.action_example1.Example1Action'>, <class 'actions.action_example2.Example2Action'>]
```

### Benchmarks

```powershell
Measure-Command { python .\main.py }

Days              : 0
Hours             : 0
Minutes           : 0
Seconds           : 0
Milliseconds      : 24
Ticks             : 240745
TotalDays         : 2.78640046296296E-07
TotalHours        : 6.68736111111111E-06
TotalMinutes      : 0.000401241666666667
TotalSeconds      : 0.0240745
TotalMilliseconds : 24.0745
```

## Solution 2

Repository: https://github.com/syrull/plugin-arch-python/tree/main/Solution-2

```
SOLUTION-2
│   main.py
│   README.md
│   register.py
│
└───actions
        action_example1.py
        action_example2.py
        __init__.py
```

The benefits of this solution are that we have a control over the decorator and we can pass some custom `*args, **kwargs` to the decorated functions.

### To Register an action

- New python file in `actions/` folder
- Create function with an appropriate name (ex. `action_onclick`)
- Decorate the function with `register_action` decorator
- Export the function in the `__all__` method in `actions/__init__.py` file

After that the function will be available at the `register` in the `main.py` file.


```python
$ python main.py
[<function action_example1 at 0x000001CC3F88D310>, <function action_example2 at 0x000001CC3F88D3A0>]
```

### Benchmarks

```console
Measure-Command { python .\main.py }

Days              : 0
Hours             : 0
Minutes           : 0
Seconds           : 0
Milliseconds      : 22
Ticks             : 227803
TotalDays         : 2.6366087962963E-07
TotalHours        : 6.32786111111111E-06
TotalMinutes      : 0.000379671666666667
TotalSeconds      : 0.0227803
TotalMilliseconds : 22.7803
```